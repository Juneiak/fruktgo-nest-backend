# Этап 1.6: WORKFORCE (Персонал)

## Краткое содержание

Модуль управления персоналом магазина: Employee (сотрудники), Shift (смены). Привязка заказов к сменам, SLA-снэпшоты.

## Предполагаемый результат

- Сотрудники создаются и управляются селлером
- Смены открываются/закрываются
- Заказы привязываются к текущей смене
- SLA фиксируется при открытии смены

---

## 1. Структура модуля

```
src/modules/workforce/
├── index.ts
├── workforce.module.ts
├── employee/
│   ├── employee.port.ts
│   ├── employee.service.ts
│   ├── employee.schema.ts
│   ├── employee.commands.ts
│   ├── employee.queries.ts
│   └── employee.enums.ts
└── shift/
    ├── shift.port.ts
    ├── shift.service.ts
    ├── shift.schema.ts
    ├── shift.commands.ts
    ├── shift.queries.ts
    └── shift.enums.ts
```

---

## 2. Employee Enums

```typescript
// src/modules/workforce/employee/employee.enums.ts

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

export enum EmployeeRole {
  MANAGER = 'manager',      // Управляющий магазином
  PICKER = 'picker',        // Сборщик заказов
  COURIER = 'courier',      // Курьер
  CASHIER = 'cashier',      // Кассир
}
```

---

## 3. Employee Schema

```typescript
// src/modules/workforce/employee/employee.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Shop } from 'src/modules/business';
import { EmployeeStatus, EmployeeRole } from './employee.enums';

@Schema({ _id: false })
export class EmployeeStatistics {
  @Prop({ type: Number, default: 0 })
  totalShifts: number;

  @Prop({ type: Number, default: 0 })
  totalOrders: number;

  @Prop({ type: Number, default: 0 })
  totalDeliveries: number;

  @Prop({ type: Number, default: 0 })
  rating: number; // 0-5

  @Prop({ type: Number, default: 0 })
  ratingsCount: number;
}

export const EmployeeStatisticsSchema = SchemaFactory.createForClass(EmployeeStatistics);

@Schema({
  timestamps: true,
  collection: 'employees',
  toJSON: { virtuals: true },
})
export class Employee {
  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: String, unique: true, sparse: true })
  phone?: string;

  @Prop({ type: Number, unique: true, sparse: true })
  telegramId?: number;

  @Prop({ type: String })
  telegramUsername?: string;

  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String })
  lastName?: string;

  @Prop({ type: String })
  avatarUrl?: string;

  @Prop({ type: [String], enum: EmployeeRole, required: true })
  roles: EmployeeRole[];

  @Prop({ type: String, enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  @Prop({ type: EmployeeStatisticsSchema, default: () => ({}) })
  statistics: EmployeeStatistics;

  // PIN для быстрого входа в смену (4 цифры)
  @Prop({ type: String })
  pin?: string;

  // Виртуальные
  employeeId: string;
  fullName: string;
}

export type EmployeeDocument = Employee & Document;
export const EmployeeSchema = SchemaFactory.createForClass(Employee);

EmployeeSchema.virtual('employeeId').get(function () {
  return this._id.toHexString();
});

EmployeeSchema.virtual('fullName').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

// Индексы
EmployeeSchema.index({ shopId: 1, status: 1 });
EmployeeSchema.index({ phone: 1 });
EmployeeSchema.index({ telegramId: 1 });
```

---

## 4. Shift Enums

```typescript
// src/modules/workforce/shift/shift.enums.ts

export enum ShiftStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  FORCE_CLOSED = 'force_closed', // Закрыта админом
}
```

---

## 5. Shift Schema

```typescript
// src/modules/workforce/shift/shift.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Shop } from 'src/modules/business';
import { Employee } from '../employee/employee.schema';
import { ShiftStatus } from './shift.enums';

@Schema({ _id: false })
export class ShiftActor {
  @Prop({ type: Types.ObjectId, required: true })
  id: Types.ObjectId;

  @Prop({ type: String, required: true })
  type: string; // employee, seller, system

  @Prop({ type: String })
  name?: string;
}

export const ShiftActorSchema = SchemaFactory.createForClass(ShiftActor);

@Schema({ _id: false })
export class SlaSnapshot {
  @Prop({ type: Number, required: true })
  assemblyTimeMinutes: number; // Целевое время сборки

  @Prop({ type: Number, required: true })
  deliveryTimeMinutes: number; // Целевое время доставки

  @Prop({ type: Date, required: true })
  capturedAt: Date;
}

export const SlaSnapshotSchema = SchemaFactory.createForClass(SlaSnapshot);

@Schema({ _id: false })
export class ShiftStatistics {
  @Prop({ type: Number, default: 0 })
  ordersCount: number;

  @Prop({ type: Number, default: 0 })
  ordersCompleted: number;

  @Prop({ type: Number, default: 0 })
  ordersCancelled: number;

  @Prop({ type: Number, default: 0 })
  totalRevenue: number; // копейки

  @Prop({ type: Number, default: 0 })
  avgAssemblyTime: number; // минуты

  @Prop({ type: Number, default: 0 })
  slaViolations: number;
}

export const ShiftStatisticsSchema = SchemaFactory.createForClass(ShiftStatistics);

@Schema({ _id: false })
export class ShiftEvent {
  @Prop({ type: String, required: true })
  type: string; // opened, closed, order_assigned, etc.

  @Prop({ type: ShiftActorSchema })
  actor?: ShiftActor;

  @Prop({ type: String })
  comment?: string;

  @Prop({ type: Object })
  data?: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const ShiftEventSchema = SchemaFactory.createForClass(ShiftEvent);

@Schema({
  timestamps: true,
  collection: 'shifts',
  toJSON: { virtuals: true },
})
export class Shift {
  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Employee.name, required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: String, enum: ShiftStatus, default: ShiftStatus.OPEN })
  status: ShiftStatus;

  @Prop({ type: Date, required: true })
  openedAt: Date;

  @Prop({ type: Date })
  closedAt?: Date;

  @Prop({ type: ShiftActorSchema, required: true })
  openedBy: ShiftActor;

  @Prop({ type: ShiftActorSchema })
  closedBy?: ShiftActor;

  @Prop({ type: SlaSnapshotSchema, required: true })
  sla: SlaSnapshot;

  @Prop({ type: ShiftStatisticsSchema, default: () => ({}) })
  statistics: ShiftStatistics;

  @Prop({ type: [ShiftEventSchema], default: [] })
  events: ShiftEvent[];

  // Заказы смены
  @Prop({ type: [Types.ObjectId], default: [] })
  orderIds: Types.ObjectId[];

  // Виртуальные
  shiftId: string;
  duration: number; // минуты
}

export type ShiftDocument = Shift & Document;
export const ShiftSchema = SchemaFactory.createForClass(Shift);

ShiftSchema.virtual('shiftId').get(function () {
  return this._id.toHexString();
});

ShiftSchema.virtual('duration').get(function () {
  const end = this.closedAt || new Date();
  return Math.round((end.getTime() - this.openedAt.getTime()) / 60000);
});

// Индексы
ShiftSchema.index({ shopId: 1, status: 1 });
ShiftSchema.index({ employeeId: 1, status: 1 });
ShiftSchema.index({ shopId: 1, openedAt: -1 });
```

---

## 6. Employee Port

```typescript
// src/modules/workforce/employee/employee.port.ts
import * as EmployeeCommands from './employee.commands';
import * as EmployeeQueries from './employee.queries';
import { Employee } from './employee.schema';

export const EMPLOYEE_PORT = Symbol('EMPLOYEE_PORT');

export interface EmployeePort {
  // Commands
  create(command: EmployeeCommands.CreateCommand): Promise<Employee>;
  update(command: EmployeeCommands.UpdateCommand): Promise<Employee>;
  addRole(command: EmployeeCommands.AddRoleCommand): Promise<Employee>;
  removeRole(command: EmployeeCommands.RemoveRoleCommand): Promise<Employee>;
  setPin(command: EmployeeCommands.SetPinCommand): Promise<void>;
  block(command: EmployeeCommands.BlockCommand): Promise<Employee>;
  unblock(command: EmployeeCommands.UnblockCommand): Promise<Employee>;
  updateStatistics(command: EmployeeCommands.UpdateStatisticsCommand): Promise<void>;

  // Queries
  getById(query: EmployeeQueries.GetByIdQuery): Promise<Employee>;
  getByShop(query: EmployeeQueries.GetByShopQuery): Promise<Employee[]>;
  getByPhone(query: EmployeeQueries.GetByPhoneQuery): Promise<Employee | null>;
  getByTelegramId(query: EmployeeQueries.GetByTelegramIdQuery): Promise<Employee | null>;
  verifyPin(query: EmployeeQueries.VerifyPinQuery): Promise<boolean>;
}
```

---

## 7. Shift Port

```typescript
// src/modules/workforce/shift/shift.port.ts
import * as ShiftCommands from './shift.commands';
import * as ShiftQueries from './shift.queries';
import { Shift } from './shift.schema';

export const SHIFT_PORT = Symbol('SHIFT_PORT');

export interface ShiftPort {
  // Commands
  open(command: ShiftCommands.OpenCommand): Promise<Shift>;
  close(command: ShiftCommands.CloseCommand): Promise<Shift>;
  forceClose(command: ShiftCommands.ForceCloseCommand): Promise<Shift>;
  assignOrder(command: ShiftCommands.AssignOrderCommand): Promise<Shift>;
  updateStatistics(command: ShiftCommands.UpdateStatisticsCommand): Promise<Shift>;
  addEvent(command: ShiftCommands.AddEventCommand): Promise<Shift>;

  // Queries
  getById(query: ShiftQueries.GetByIdQuery): Promise<Shift>;
  getOpenByEmployee(query: ShiftQueries.GetOpenByEmployeeQuery): Promise<Shift | null>;
  getOpenByShop(query: ShiftQueries.GetOpenByShopQuery): Promise<Shift[]>;
  getByShop(query: ShiftQueries.GetByShopQuery): Promise<Shift[]>;
  getByEmployee(query: ShiftQueries.GetByEmployeeQuery): Promise<Shift[]>;
}
```

---

## 8. Shift Commands

```typescript
// src/modules/workforce/shift/shift.commands.ts
import { CommonCommandOptions } from 'src/common';
import { ShiftActor } from './shift.schema';

export class OpenCommand {
  constructor(
    public readonly data: {
      shopId: string;
      employeeId: string;
      openedBy: ShiftActor;
      sla: {
        assemblyTimeMinutes: number;
        deliveryTimeMinutes: number;
      };
    },
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class CloseCommand {
  constructor(
    public readonly shiftId: string,
    public readonly closedBy: ShiftActor,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class ForceCloseCommand {
  constructor(
    public readonly shiftId: string,
    public readonly closedBy: ShiftActor,
    public readonly reason: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class AssignOrderCommand {
  constructor(
    public readonly shiftId: string,
    public readonly orderId: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class UpdateStatisticsCommand {
  constructor(
    public readonly shiftId: string,
    public readonly data: {
      incrementOrders?: number;
      incrementCompleted?: number;
      incrementCancelled?: number;
      incrementRevenue?: number;
      newAssemblyTime?: number; // для пересчёта avg
      incrementSlaViolations?: number;
    },
    public readonly options?: CommonCommandOptions,
  ) {}
}
```

---

## 9. Shift Service (открытие/закрытие)

```typescript
// src/modules/workforce/shift/shift.service.ts (частично)
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shift, ShiftDocument, ShiftStatus } from './shift.schema';
import { DomainError } from 'src/common';

@Injectable()
export class ShiftService implements ShiftPort {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
  ) {}

  async open(command: OpenCommand): Promise<Shift> {
    const { shopId, employeeId, openedBy, sla } = command.data;

    // Проверяем, нет ли уже открытой смены у сотрудника
    const existingOpen = await this.shiftModel.findOne({
      employeeId,
      status: ShiftStatus.OPEN,
    });

    if (existingOpen) {
      throw DomainError.invariant('Employee already has an open shift', {
        employeeId,
        existingShiftId: existingOpen._id.toString(),
      });
    }

    const shift = await this.shiftModel.create({
      shopId,
      employeeId,
      status: ShiftStatus.OPEN,
      openedAt: new Date(),
      openedBy,
      sla: {
        ...sla,
        capturedAt: new Date(),
      },
      events: [{
        type: 'opened',
        actor: openedBy,
        timestamp: new Date(),
      }],
    });

    return shift;
  }

  async close(command: CloseCommand): Promise<Shift> {
    const { shiftId, closedBy } = command;

    const shift = await this.shiftModel.findById(shiftId);
    if (!shift) {
      throw DomainError.notFound('Shift', shiftId);
    }

    if (shift.status !== ShiftStatus.OPEN) {
      throw DomainError.invariant('Shift is not open', {
        shiftId,
        currentStatus: shift.status,
      });
    }

    shift.status = ShiftStatus.CLOSED;
    shift.closedAt = new Date();
    shift.closedBy = closedBy;
    shift.events.push({
      type: 'closed',
      actor: closedBy,
      timestamp: new Date(),
    });

    await shift.save();
    return shift;
  }
}
```

---

## 10. Взаимодействие с другими модулями

| Модуль | Направление | Описание |
|--------|-------------|----------|
| BUSINESS | ← | Привязка к Shop |
| AUTH | ← | Аутентификация сотрудника |
| ORDERS | ← | Привязка заказов к смене, обновление статистики |
| LOGISTICS | → | Курьеры для доставки |
| COMMUNICATIONS | → | Уведомления о новых заказах |

---

## 11. Endpoints

### Seller

```
GET    /seller/shops/:shopId/employees
POST   /seller/shops/:shopId/employees
PATCH  /seller/shops/:shopId/employees/:id
DELETE /seller/shops/:shopId/employees/:id
POST   /seller/shops/:shopId/employees/:id/block
POST   /seller/shops/:shopId/employees/:id/unblock

GET    /seller/shops/:shopId/shifts
GET    /seller/shops/:shopId/shifts/open
```

### Employee

```
POST   /employee/shift/open
POST   /employee/shift/close
GET    /employee/shift/current
GET    /employee/shifts
GET    /employee/profile
PATCH  /employee/profile
POST   /employee/pin
```

---

## Чеклист готовности

- [ ] Employee CRUD работает
- [ ] Смена открывается/закрывается
- [ ] SLA фиксируется при открытии
- [ ] Заказы привязываются к смене
- [ ] Статистика смены обновляется
- [ ] События смены записываются
- [ ] PIN верификация работает
