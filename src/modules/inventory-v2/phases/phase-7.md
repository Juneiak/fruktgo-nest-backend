# Фаза 7: Оркестратор

> **Срок:** 3-4 дня  
> **Зависимости:** ВСЕ предыдущие фазы

---

## Что делаем в этой фазе

**InventoryOrchestrator** — единый координатор всех операций складской системы.

---

## Зачем это нужно (простыми словами)

Представь, что у тебя есть:
- Приёмка (Receiving)
- Перемещение (Transfer)
- Списание (WriteOff)
- Возврат (Return)
- Инвентаризация (Audit)
- Резервирование (Reservation)

Каждый модуль работает сам по себе. Но в реальности:
- Приёмка должна обновить цены
- Перемещение должно пересчитать сроки
- Возврат может создать списание
- Всё должно быть в транзакции

**Оркестратор** — это "дирижёр", который:
1. Координирует работу всех модулей
2. Обеспечивает транзакционность
3. Вызывает побочные эффекты (уведомления, события)
4. Предоставляет единый API для всей системы

---

## Порядок разработки

### Шаг 1: Структура оркестратора

**Файлы:**
- `orchestrator/inventory.orchestrator.ts`
- `orchestrator/inventory.orchestrator.types.ts`
- `orchestrator/index.ts`

**Инъекции:**

```typescript
@Injectable()
export class InventoryOrchestrator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    
    // Порты модулей
    @Inject(BATCH_PORT) private readonly batchPort: BatchPort,
    @Inject(BATCH_LOCATION_PORT) private readonly batchLocationPort: BatchLocationPort,
    @Inject(RECEIVING_PORT) private readonly receivingPort: ReceivingPort,
    @Inject(TRANSFER_PORT) private readonly transferPort: TransferPort,
    @Inject(WRITE_OFF_PORT) private readonly writeOffPort: WriteOffPort,
    @Inject(RETURN_PORT) private readonly returnPort: ReturnPort,
    @Inject(AUDIT_PORT) private readonly auditPort: AuditPort,
    @Inject(MOVEMENT_PORT) private readonly movementPort: MovementPort,
    @Inject(RESERVATION_PORT) private readonly reservationPort: ReservationPort,
    @Inject(STOREFRONT_PRODUCT_PORT) private readonly storefrontProductPort: StorefrontProductPort,
    
    // Сервисы
    private readonly shelfLifeCalculator: ShelfLifeCalculatorService,
    private readonly expirationAlerts: ExpirationAlertService,
    private readonly pricingService: PricingService,
    
    // События
    private readonly eventEmitter: EventEmitter2,
  ) {}
}
```

---

### Шаг 2: Методы оркестратора

#### 2.1 Приёмка

```typescript
// Создать черновик приёмки
async createReceiving(input: CreateReceivingInput): Promise<Receiving> {
  return this.receivingPort.create(input)
}

// Подтвердить приёмку (создать партии)
async confirmReceiving(input: ConfirmReceivingInput): Promise<Receiving> {
  const session = await this.connection.startSession()
  
  try {
    session.startTransaction()
    
    const receiving = await this.receivingPort.getById(input.receivingId)
    
    for (const item of receiving.items) {
      // 1. Создаём партию
      const batch = await this.batchPort.create({
        ...item,
        // Рассчитываем срок через калькулятор
        effectiveExpirationDate: this.shelfLifeCalculator.calculateNewExpirationDate(...)
      }, { session })
      
      // 2. Создаём BatchLocation
      await this.batchLocationPort.create({
        batch: batch._id,
        storageLocation: receiving.destinationLocation,
        quantity: item.actualQuantity,
      }, { session })
      
      // 3. Записываем Movement
      await this.movementPort.create({
        type: MovementType.RECEIVING,
        batch: batch._id,
        quantityChange: item.actualQuantity,
        document: { type: 'RECEIVING', id: receiving._id },
      }, { session })
      
      // 4. Обновляем закупочную цену на витрине
      await this.pricingService.updatePurchasePriceFromBatch({
        productTemplateId: item.productTemplate,
        batchPurchasePrice: item.purchasePrice,
      }, { session })
      
      // 5. Привязываем партию к позиции
      item.createdBatch = batch._id
    }
    
    receiving.status = ReceivingStatus.CONFIRMED
    receiving.confirmedAt = new Date()
    await receiving.save({ session })
    
    await session.commitTransaction()
    
    // 6. Эмитим событие
    this.eventEmitter.emit('inventory.receiving.confirmed', { receiving })
    
    return receiving
    
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}
```

#### 2.2 Перемещение

```typescript
// Создать черновик перемещения
async createTransfer(input: CreateTransferInput): Promise<Transfer>

// Отправить (списать из источника)
async sendTransfer(input: SendTransferInput): Promise<Transfer> {
  const session = await this.connection.startSession()
  
  try {
    session.startTransaction()
    
    const transfer = await this.transferPort.getById(input.transferId)
    
    for (const item of transfer.items) {
      // 1. Уменьшаем остаток в источнике
      await this.batchLocationPort.decrease({
        batchLocationId: item.sourceBatchLocation,
        quantity: item.quantity,
      }, { session })
      
      // 2. Рассчитываем новую свежесть
      const { freshnessAfter, newExpiration } = this.shelfLifeCalculator.recalculateBatchShelfLife({
        batch: item.batch,
        oldLocation: transfer.sourceLocation,
        newLocation: transfer.targetLocation,
      })
      
      item.freshnessAfterTransfer = freshnessAfter
      item.newEffectiveExpiration = newExpiration
      
      // 3. Movement: TRANSFER_OUT
      await this.movementPort.create({
        type: MovementType.TRANSFER_OUT,
        batch: item.batch,
        storageLocation: transfer.sourceLocation,
        quantityChange: -item.quantity,
        document: { type: 'TRANSFER', id: transfer._id },
      }, { session })
    }
    
    transfer.status = TransferStatus.SENT
    transfer.sentAt = new Date()
    await transfer.save({ session })
    
    await session.commitTransaction()
    
    this.eventEmitter.emit('inventory.transfer.sent', { transfer })
    
    return transfer
    
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

// Принять (записать в получатель)
async receiveTransfer(input: ReceiveTransferInput): Promise<Transfer>
```

#### 2.3 Списание

```typescript
async createWriteOff(input: CreateWriteOffInput): Promise<WriteOff>

async confirmWriteOff(input: ConfirmWriteOffInput): Promise<WriteOff> {
  const session = await this.connection.startSession()
  
  try {
    session.startTransaction()
    
    const writeOff = await this.writeOffPort.getById(input.writeOffId)
    
    for (const item of writeOff.items) {
      // 1. Уменьшаем остаток
      const batchLocation = await this.batchLocationPort.decrease({
        batchId: item.batch,
        storageLocationId: writeOff.storageLocation,
        quantity: item.quantity,
      }, { session })
      
      // 2. Обновляем партию
      await this.batchPort.decreaseQuantity({
        batchId: item.batch,
        quantity: item.quantity,
      }, { session })
      
      // 3. Movement: WRITE_OFF
      await this.movementPort.create({
        type: MovementType.WRITE_OFF,
        batch: item.batch,
        storageLocation: writeOff.storageLocation,
        quantityChange: -item.quantity,
        document: { type: 'WRITE_OFF', id: writeOff._id },
      }, { session })
    }
    
    writeOff.status = WriteOffStatus.CONFIRMED
    writeOff.confirmedAt = new Date()
    await writeOff.save({ session })
    
    await session.commitTransaction()
    
    this.eventEmitter.emit('inventory.writeOff.confirmed', { writeOff })
    
    return writeOff
    
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}
```

#### 2.4 Возвраты

```typescript
async createReturn(input: CreateReturnInput): Promise<Return>

async inspectReturn(input: InspectReturnInput): Promise<Return>

async completeReturn(input: CompleteReturnInput): Promise<Return> {
  const session = await this.connection.startSession()
  
  try {
    session.startTransaction()
    
    const returnDoc = await this.returnPort.getById(input.returnId)
    
    for (const item of returnDoc.items) {
      switch (item.decision) {
        case ReturnDecision.RETURN_TO_SHELF:
        case ReturnDecision.RETURN_WITH_DISCOUNT:
          // Создаём/обновляем BatchLocation
          await this.batchLocationPort.increase({
            batchId: item.batch,
            storageLocationId: returnDoc.storageLocation,
            quantity: item.quantity,
          }, { session })
          
          // Обновляем срок партии
          await this.batchPort.updateExpiration({
            batchId: item.batch,
            newFreshness: item.newFreshnessRemaining,
            newExpiration: item.newEffectiveExpiration,
          }, { session })
          
          // Movement
          await this.movementPort.create({
            type: MovementType.RETURN_TO_STOCK,
            batch: item.batch,
            quantityChange: item.quantity,
          }, { session })
          
          // Если со скидкой — обновляем StorefrontProduct
          if (item.decision === ReturnDecision.RETURN_WITH_DISCOUNT) {
            await this.storefrontProductPort.applyDiscount({
              productTemplateId: item.productTemplate,
              discount: {
                type: 'PERCENT',
                value: item.discountPercent,
                reason: DiscountReason.RETURNED_ITEM,
              }
            }, { session })
          }
          break
          
        case ReturnDecision.WRITE_OFF:
          // Создаём WriteOff
          const writeOff = await this.writeOffPort.create({
            items: [{ batch: item.batch, quantity: item.quantity, reason: WriteOffReason.QUALITY_ISSUE }],
          }, { session })
          
          // Подтверждаем его
          await this.confirmWriteOff({ writeOffId: writeOff._id }, { session })
          
          item.writeOffId = writeOff._id
          break
      }
    }
    
    returnDoc.status = ReturnStatus.COMPLETED
    returnDoc.completedAt = new Date()
    await returnDoc.save({ session })
    
    await session.commitTransaction()
    
    this.eventEmitter.emit('inventory.return.completed', { return: returnDoc })
    
    return returnDoc
    
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}
```

#### 2.5 Инвентаризация

```typescript
async createAudit(input: CreateAuditInput): Promise<Audit>

async startAudit(input: StartAuditInput): Promise<Audit>

async updateAuditItems(input: UpdateAuditItemsInput): Promise<Audit>

async completeAudit(input: CompleteAuditInput): Promise<Audit>
```

#### 2.6 Резервирование (для заказов)

```typescript
// Зарезервировать товар под заказ
async reserveForOrder(input: ReserveForOrderInput): Promise<Reservation> {
  const session = await this.connection.startSession()
  
  try {
    session.startTransaction()
    
    const items: ReservationItem[] = []
    
    for (const requestedItem of input.items) {
      // Резервируем по FEFO
      const reserved = await this.batchLocationPort.reserveByFefo({
        storageLocationId: input.storageLocationId,
        productTemplateId: requestedItem.productTemplate,
        quantity: requestedItem.quantity,
      }, { session })
      
      items.push(...reserved.items)
      
      // Movement для каждой затронутой партии
      for (const reservedBatch of reserved.items) {
        await this.movementPort.create({
          type: MovementType.RESERVATION,
          batch: reservedBatch.batch,
          storageLocation: input.storageLocationId,
          quantityChange: 0, // Резерв не меняет quantity, меняет reservedQuantity
          document: { type: 'ORDER', id: input.orderId },
        }, { session })
      }
    }
    
    const reservation = await this.reservationPort.create({
      order: input.orderId,
      shop: input.shopId,
      items,
      expiresAt: new Date(Date.now() + input.reservationTTLMinutes * 60 * 1000),
    }, { session })
    
    await session.commitTransaction()
    
    return reservation
    
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

// Снять резерв (отмена заказа)
async releaseReservation(input: ReleaseReservationInput): Promise<void>

// Списать зарезервированный товар (заказ собран)
async consumeReservation(input: ConsumeReservationInput): Promise<void>
```

#### 2.7 Офлайн-продажа

```typescript
// Проверить конфликт с резервами
async checkOfflineSaleConflict(input: CheckConflictInput): Promise<ConflictResult> {
  const { storageLocationId, productTemplateId, quantity } = input
  
  // Получаем агрегированный остаток
  const stock = await this.batchLocationPort.getAggregatedStock({
    storageLocationId,
    productTemplateId,
  })
  
  const available = stock.quantity - stock.reservedQuantity
  
  if (quantity <= available) {
    return { hasConflict: false, available }
  }
  
  // Есть конфликт — ищем затронутые резервы
  const reservations = await this.reservationPort.findActiveByProduct({
    storageLocationId,
    productTemplateId,
  })
  
  return {
    hasConflict: true,
    available,
    shortage: quantity - available,
    affectedReservations: reservations,
  }
}

// Обработать офлайн-продажу (с возможным "захватом" резерва)
async processOfflineSale(input: ProcessOfflineSaleInput): Promise<void> {
  const session = await this.connection.startSession()
  
  try {
    session.startTransaction()
    
    // Если нужно забрать из резерва — сначала снимаем резерв
    if (input.reservationIdsToRelease?.length > 0) {
      for (const reservationId of input.reservationIdsToRelease) {
        await this.releaseReservation({ reservationId }, { session })
        
        // Уведомляем клиента
        this.eventEmitter.emit('inventory.reservation.released', {
          reservationId,
          reason: 'OFFLINE_SALE_PRIORITY',
        })
      }
    }
    
    // Списываем товар по FEFO
    const consumed = await this.batchLocationPort.consumeByFefo({
      storageLocationId: input.storageLocationId,
      productTemplateId: input.productTemplateId,
      quantity: input.quantity,
    }, { session })
    
    // Movement для каждой партии
    for (const item of consumed.items) {
      await this.movementPort.create({
        type: MovementType.OFFLINE_SALE,
        batch: item.batch,
        storageLocation: input.storageLocationId,
        quantityChange: -item.quantity,
      }, { session })
    }
    
    await session.commitTransaction()
    
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}
```

#### 2.8 Остатки

```typescript
// Получить остатки по локации
async getLocationStock(query: GetLocationStockQuery): Promise<LocationStock>

// Получить остатки по товару (во всех локациях продавца)
async getProductStock(query: GetProductStockQuery): Promise<ProductStock>
```

---

### Шаг 3: Главный модуль

**Файлы:**
- `new-inventory.module.ts`
- `index.ts`

```typescript
// new-inventory.module.ts
@Module({
  imports: [
    // Core
    ShelfLifeCalculatorModule,
    
    // Entities
    ProductTemplateModule,
    StorageLocationModule,
    StorefrontModule,
    StorefrontProductModule,
    
    // Batch
    BatchModule,
    BatchLocationModule,
    MixedBatchModule,
    
    // Operations
    ReceivingModule,
    TransferModule,
    WriteOffModule,
    ReturnModule,
    AuditModule,
    
    // Support
    MovementModule,
    ReservationModule,
    AlertsModule,
    PricingModule,
  ],
  providers: [
    InventoryOrchestrator,
  ],
  exports: [
    // Экспортируем оркестратор и порты
    InventoryOrchestrator,
    INVENTORY_ORCHESTRATOR, // Токен для инъекции
    
    // Порты модулей (для прямого доступа, если нужно)
    PRODUCT_TEMPLATE_PORT,
    STORAGE_LOCATION_PORT,
    STOREFRONT_PORT,
    STOREFRONT_PRODUCT_PORT,
    BATCH_PORT,
    BATCH_LOCATION_PORT,
    // ...
  ],
})
export class NewInventoryModule {}
```

---

## Структура файлов после Фазы 7

```
src/modules/new-inventory/
├── core/                    # Фаза 1
├── entities/                # Фаза 1
├── batch/                   # Фаза 2
├── movement/                # Фаза 3
├── reservation/             # Фаза 3
├── operations/              # Фазы 3-5
├── alerts/                  # Фаза 4
├── pricing/                 # Фаза 6
│
├── orchestrator/            # НОВОЕ
│   ├── inventory.orchestrator.ts
│   ├── inventory.orchestrator.types.ts
│   └── index.ts
│
├── new-inventory.module.ts  # Главный модуль
└── index.ts                 # Barrel export
```

---

## Чек-лист готовности

- [ ] Оркестратор — все методы для всех операций
- [ ] Все методы транзакционные
- [ ] События эмитятся после успешных операций
- [ ] Интеграция с OrderProcess (резервирование)
- [ ] NewInventoryModule собирает все подмодули
- [ ] Barrel export всех публичных API
- [ ] Интеграционные тесты

---

## Результат Фазы 7

После завершения:
1. Единый API для всей складской системы
2. Все операции атомарные (транзакции)
3. События для интеграции с другими модулями
4. Готовый модуль для подключения в приложение

**Система готова к использованию!**

---

## Использование оркестратора

```typescript
// В любом сервисе
@Injectable()
export class SomeService {
  constructor(
    @Inject(INVENTORY_ORCHESTRATOR)
    private readonly inventory: InventoryOrchestrator,
  ) {}
  
  async someMethod() {
    // Приёмка
    const receiving = await this.inventory.createReceiving({ ... })
    await this.inventory.confirmReceiving({ receivingId: receiving._id })
    
    // Резервирование для заказа
    const reservation = await this.inventory.reserveForOrder({
      orderId: order._id,
      storageLocationId: shop.storageLocation,
      items: orderItems,
    })
    
    // Офлайн-продажа
    await this.inventory.processOfflineSale({
      storageLocationId,
      productTemplateId,
      quantity: 5,
    })
  }
}
```
