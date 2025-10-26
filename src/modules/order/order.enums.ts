import { UserType } from "src/common/enums/common.enum";

export enum OrderStatus {
  PENDING = 'pending',              // Ожидает принятия
  ASSEMBLING = 'assembling',        // Собирается
  AWAITING_COURIER = 'awaitingCourier', // Ожидает курьера
  IN_DELIVERY = 'inDelivery',       // В доставке
  DELIVERED = 'delivered',          // Доставлен
  CANCELLED = 'cancelled',          // Отменен клиентом
  DECLINED = 'declined',            // Отклонен магазином
  RETURNED = 'returned',            // Возвращен
}

export enum OrderEventActorType {
  CUSTOMER = UserType.CUSTOMER,
  EMPLOYEE = UserType.EMPLOYEE,
  ADMIN = UserType.ADMIN,
}

export enum OrderEventSource {
  APP = 'app',
  WEB = 'web',
  TELEGRAM = 'telegram',
  API = 'api'
}

export enum OrderEventType {
  CREATED = 'created',                    // Заказ создан
  ACCEPTED = 'accepted',                  // Заказ принят в работу
  ASSEMBLY_STARTED = 'assemblyStarted',   // Начата сборка
  ASSEMBLY_COMPLETED = 'assemblyCompleted', // Сборка завершена
  COURIER_CALLED = 'courierCalled',       // Курьер вызван
  HANDED_TO_COURIER = 'handedToCourier',  // Передано курьеру
  DELIVERY_STARTED = 'deliveryStarted',   // Доставка начата
  DELIVERED = 'delivered',                // Доставлен
  CANCELLED = 'cancelled',                // Отменен
  DECLINED = 'declined',                  // Отклонен
  RETURNED = 'returned',                  // Возвращен
  STATUS_CHANGED = 'statusChanged',       // Изменение статуса
  COMMENT_ADDED = 'commentAdded',         // Добавлен комментарий
  RATING_SET = 'ratingSet',               // Установлен рейтинг
}

export enum PositiveFeedbackTag {
  GOOD_QUALITY = 'goodQuality',
  FRESH_PRODUCTS = 'freshProducts',
  FAST_DELIVERY = 'fastDelivery',
  GOOD_COMMUNICATION = 'goodCommunication',
  GOOD_PRICE = 'goodPrice'
}

export enum NegativeFeedbackTag {
  DELAYED_DELIVERY = 'delayedDelivery', 
  LOW_QUALITY = 'lowQuality',
  DAMAGED_PACKAGING = 'damagedPackaging',
  WRONG_ITEMS = 'wrongItems',
  HIGH_PRICE = 'highPrice'
}

export enum OrderDeclineReason {
  OUT_OF_STOCK = 'outOfStock',             // Товар закончился на складе
  CLOSED_SHOP = 'closedShop',              // Магазин закрыт (внеплановое закрытие)
  PRICE_CHANGED = 'priceChanged',          // Изменились цены
  QUALITY_ISSUES = 'qualityIssues',        // Проблемы с качеством товара
  INSUFFICIENT_QUANTITY = 'insufficientQuantity', // Недостаточное количество товара
  TECHNICAL_ISSUES = 'technicalIssues',    // Технические проблемы
  WRONG_PRICE = 'wrongPrice',              // Неверная цена в системе
  TEMPORARILY_UNAVAILABLE = 'temporarilyUnavailable', // Товар временно недоступен
  OTHER = 'other'                          // Другая причина (требует комментария)
}

export enum OrderCancelReason {
  CHANGED_MIND = 'changedMind',             // Передумал
  DUPLICATE_ORDER = 'duplicateOrder',       // Дублирующий заказ
  LONG_DELIVERY_TIME = 'longDeliveryTime',  // Долгое время доставки
  DELIVERY_ISSUES = 'deliveryIssues',       // Проблемы с доставкой
  PAYMENT_ISSUES = 'paymentIssues',         // Проблемы с оплатой
  PRICE_TOO_HIGH = 'priceTooHigh',          // Слишком высокая цена
  FOUND_BETTER_OFFER = 'foundBetterOffer',  // Нашел лучшее предложение
  UNAVAILABLE_DELIVERY_TIME = 'unavailableDeliveryTime', // Неподходящее время доставки
  ORDERED_BY_MISTAKE = 'orderedByMistake',  // Ошибочный заказ
  SELECTED_WRONG_ITEMS = 'selectedWrongItems', // Выбраны неверные товары
  OTHER = 'other'                           // Другая причина (требует комментария)
}

// Маппинг: какой стейдж заполняется ПРИ ПЕРЕХОДЕ В статус
// Логика: когда меняем статус на X, мы завершаем предыдущий этап
export const OrderStatusCompletedStageMap = {
  [OrderStatus.PENDING]: null,                    // Создан, ничего не завершено
  [OrderStatus.ASSEMBLING]: null,                 // Принят к сборке (можно добавить acceptedStage если нужно)
  [OrderStatus.AWAITING_COURIER]: 'assembledStage', // Собран → заполняем assembledStage
  [OrderStatus.IN_DELIVERY]: 'courierStage',      // Курьер забрал → заполняем courierStage
  [OrderStatus.DELIVERED]: 'deliveredStage',      // Доставлен → заполняем deliveredStage
  [OrderStatus.CANCELLED]: 'canceledStage',       // Отменен → заполняем canceledStage
  [OrderStatus.DECLINED]: 'declinedStage',        // Отклонен → заполняем declinedStage
  [OrderStatus.RETURNED]: 'returnedStage',        // Возвращен → заполняем returnedStage
} as const;


// Последовательность статусов (нормальный flow)
export const OrderStatusFlow = [
  OrderStatus.PENDING,
  OrderStatus.ASSEMBLING,
  OrderStatus.AWAITING_COURIER,
  OrderStatus.IN_DELIVERY,
  OrderStatus.DELIVERED,
] as const;

// Терминальные статусы (конечные состояния)
export const OrderStatusTerminal = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.DECLINED,
  OrderStatus.RETURNED,
] as const;

// Активные статусы (заказ в работе)
export const OrderStatusActive = [
  OrderStatus.PENDING,
  OrderStatus.ASSEMBLING,
  OrderStatus.AWAITING_COURIER,
  OrderStatus.IN_DELIVERY,
] as const;
