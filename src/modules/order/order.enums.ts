export enum OrderStatus {
  PENDING='pending',
  PREPARING='preparing',
  AWAITING_COURIER='awaitingCourier',
  DELIVERING='delivering',
  DELIVERED='delivered',
  CANCELLED='cancelled',
  DECLINED='declined',
  FAILED='failed',
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
