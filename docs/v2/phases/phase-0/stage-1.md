# Этап 0.1: Redis + BullMQ

## Краткое содержание

Настройка Redis и распределённой шины событий на базе BullMQ. Это фундамент для масштабирования — без него события теряются при >1 инстансе приложения.

## Предполагаемый результат

- Redis работает в docker-compose
- EventBusPort абстракция готова
- BullMQ adapter для прода
- EventEmitter adapter для локальной разработки
- Очереди разделены по приоритетам

---

## 1. Docker Compose

### Добавить Redis сервис

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  redis_data:
```

---

## 2. Зависимости

```bash
npm install @nestjs/bullmq bullmq ioredis
npm install -D @types/ioredis
```

---

## 3. Структура модуля

```
src/infra/event-bus/
├── index.ts                    # Barrel export
├── event-bus.module.ts         # NestJS модуль
├── event-bus.port.ts           # Интерфейс + токен
├── event-bus.types.ts          # Типы событий
├── adapters/
│   ├── bullmq.adapter.ts       # Prod adapter
│   └── local.adapter.ts        # Dev adapter (EventEmitter)
└── queues/
    └── queue.config.ts         # Конфиг очередей
```

---

## 4. EventBusPort (Интерфейс)

```typescript
// src/infra/event-bus/event-bus.port.ts
export const EVENT_BUS_PORT = Symbol('EVENT_BUS_PORT');

export interface EventBusPort {
  /**
   * Публикует событие в шину
   * @param event - Имя события (например, 'order.created')
   * @param payload - Данные события
   * @param options - Опции (приоритет, задержка)
   */
  emit<T>(event: string, payload: T, options?: EmitOptions): Promise<void>;

  /**
   * Подписка на событие (используется в @OnEvent декораторах)
   */
  subscribe<T>(event: string, handler: EventHandler<T>): void;
}

export interface EmitOptions {
  priority?: 'high' | 'default' | 'low';
  delay?: number; // ms
  attempts?: number;
}

export type EventHandler<T> = (payload: T) => Promise<void>;
```

---

## 5. Типы событий

```typescript
// src/infra/event-bus/event-bus.types.ts

// Очереди по приоритету
export enum EventQueue {
  HIGH = 'events:high',       // заказы, платежи
  DEFAULT = 'events:default', // уведомления
  LOW = 'events:low',         // аналитика
}

// Базовый интерфейс события
export interface BaseEvent {
  eventId: string;      // UUID для idempotency
  timestamp: Date;
  source: string;       // модуль-источник
}

// Примеры событий (будут расширяться)
export interface OrderCreatedEvent extends BaseEvent {
  orderId: string;
  customerId: string;
  shopId: string;
  totalAmount: number;
}

export interface OrderStatusChangedEvent extends BaseEvent {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
}

// Маппинг событий на очереди
export const EVENT_QUEUE_MAP: Record<string, EventQueue> = {
  'order.created': EventQueue.HIGH,
  'order.status_changed': EventQueue.HIGH,
  'payment.completed': EventQueue.HIGH,
  'notification.send': EventQueue.DEFAULT,
  'analytics.track': EventQueue.LOW,
};
```

---

## 6. BullMQ Adapter (Prod)

```typescript
// src/infra/event-bus/adapters/bullmq.adapter.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { EventBusPort, EmitOptions, EventHandler } from '../event-bus.port';
import { EventQueue, EVENT_QUEUE_MAP, BaseEvent } from '../event-bus.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BullMQEventBusAdapter implements EventBusPort, OnModuleInit, OnModuleDestroy {
  private queues: Map<EventQueue, Queue> = new Map();
  private workers: Map<EventQueue, Worker> = new Map();
  private handlers: Map<string, EventHandler<any>[]> = new Map();

  private readonly connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  async onModuleInit() {
    // Создаём очереди
    for (const queue of Object.values(EventQueue)) {
      this.queues.set(queue, new Queue(queue, { connection: this.connection }));
      
      // Создаём воркеры
      const worker = new Worker(
        queue,
        async (job: Job) => {
          const { event, payload } = job.data;
          const eventHandlers = this.handlers.get(event) || [];
          
          for (const handler of eventHandlers) {
            await handler(payload);
          }
        },
        {
          connection: this.connection,
          concurrency: queue === EventQueue.HIGH ? 10 : 5,
        }
      );
      
      this.workers.set(queue, worker);
    }
  }

  async onModuleDestroy() {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    for (const worker of this.workers.values()) {
      await worker.close();
    }
  }

  async emit<T>(event: string, payload: T, options?: EmitOptions): Promise<void> {
    const queueName = this.getQueueForEvent(event, options?.priority);
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const eventPayload: BaseEvent & T = {
      eventId: uuidv4(),
      timestamp: new Date(),
      source: 'backend',
      ...payload,
    };

    await queue.add(event, { event, payload: eventPayload }, {
      delay: options?.delay,
      attempts: options?.attempts || this.getDefaultAttempts(queueName),
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: 1000, // храним 1000 failed jobs для дебага
    });
  }

  subscribe<T>(event: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }

  private getQueueForEvent(event: string, priority?: EmitOptions['priority']): EventQueue {
    if (priority === 'high') return EventQueue.HIGH;
    if (priority === 'low') return EventQueue.LOW;
    return EVENT_QUEUE_MAP[event] || EventQueue.DEFAULT;
  }

  private getDefaultAttempts(queue: EventQueue): number {
    return queue === EventQueue.HIGH ? 5 : 3;
  }
}
```

---

## 7. Local Adapter (Dev)

```typescript
// src/infra/event-bus/adapters/local.adapter.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusPort, EmitOptions, EventHandler } from '../event-bus.port';
import { BaseEvent } from '../event-bus.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LocalEventBusAdapter implements EventBusPort {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async emit<T>(event: string, payload: T, options?: EmitOptions): Promise<void> {
    const eventPayload: BaseEvent & T = {
      eventId: uuidv4(),
      timestamp: new Date(),
      source: 'backend',
      ...payload,
    };

    if (options?.delay) {
      setTimeout(() => {
        this.eventEmitter.emit(event, eventPayload);
      }, options.delay);
    } else {
      this.eventEmitter.emit(event, eventPayload);
    }
  }

  subscribe<T>(event: string, handler: EventHandler<T>): void {
    this.eventEmitter.on(event, handler);
  }
}
```

---

## 8. Event Bus Module

```typescript
// src/infra/event-bus/event-bus.module.ts
import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EVENT_BUS_PORT } from './event-bus.port';
import { BullMQEventBusAdapter } from './adapters/bullmq.adapter';
import { LocalEventBusAdapter } from './adapters/local.adapter';

const isProduction = process.env.NODE_ENV === 'production';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
  ],
  providers: [
    {
      provide: EVENT_BUS_PORT,
      useClass: isProduction ? BullMQEventBusAdapter : LocalEventBusAdapter,
    },
  ],
  exports: [EVENT_BUS_PORT],
})
export class EventBusModule {}
```

---

## 9. Barrel Export

```typescript
// src/infra/event-bus/index.ts
export { EventBusModule } from './event-bus.module';
export { EVENT_BUS_PORT, EventBusPort, EmitOptions, EventHandler } from './event-bus.port';
export * from './event-bus.types';
```

---

## 10. Использование

```typescript
// В любом модуле
import { EVENT_BUS_PORT, EventBusPort } from 'src/infra/event-bus';

@Injectable()
export class OrderService {
  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  async createOrder(data: CreateOrderDto): Promise<Order> {
    const order = await this.orderModel.create(data);
    
    await this.eventBus.emit('order.created', {
      orderId: order._id.toString(),
      customerId: data.customerId,
      shopId: data.shopId,
      totalAmount: data.totalAmount,
    });
    
    return order;
  }
}

// Подписка через декоратор
@OnEvent('order.created')
async handleOrderCreated(event: OrderCreatedEvent) {
  // COMMUNICATIONS: отправить уведомление
  // INVENTORY: зарезервировать товары
}
```

---

## 11. Environment Variables

```env
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development  # production для BullMQ
```

---

## Чеклист готовности

- [ ] Redis запускается в docker-compose
- [ ] `EventBusModule` импортирован в `AppModule`
- [ ] Тест: `emit` + `subscribe` работают в dev режиме
- [ ] Тест: BullMQ jobs создаются в prod режиме
- [ ] Очереди разделены по приоритетам (high/default/low)
