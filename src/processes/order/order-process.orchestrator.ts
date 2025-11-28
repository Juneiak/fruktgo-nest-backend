import { Injectable, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Common
import { DomainError } from 'src/common/errors';
import { DEFAULT_MIN_WEIGHT_DIFFERENCE_PERCENTAGE, DEFAULT_SYSTEM_TAX } from 'src/common/constants';

// Domain Modules
import { Order, OrderPort, ORDER_PORT, OrderEnums } from 'src/modules/order';
import { ShopPort, SHOP_PORT, ShopEnums } from 'src/modules/shop';
import { ShiftPort, SHIFT_PORT, ShiftEnums } from 'src/modules/shift';
import { CUSTOMER_PORT, CustomerPort } from 'src/modules/customer';
import { CartPort, CART_PORT, CartQueries, CartCommands } from 'src/modules/cart';

import { ShopProductPort, SHOP_PRODUCT_PORT, ShopProductQueries, ShopProductCommands } from 'src/modules/shop-product';

// Finance
import { 
  FINANCE_PROCESS_ORCHESTRATOR, 
  FinanceProcessOrchestrator 
} from 'src/processes/finance';

// Process types
import {
  CheckoutInput,
  CheckoutResult,
  AcceptOrderInput,
  CompleteAssemblyInput,
  AssemblyResult,
  HandToCourierInput,
  DeliverOrderInput,
  DeliveryResult,
  CancelOrderInput,
  DeclineOrderInput,
  SetRatingInput,
  WeightCompensationResult,
} from './order-process.types';

// Default delivery settings
const DEFAULT_DELIVERY_PRICE = 0;
const DEFAULT_DELIVERY_TIME = 60; // minutes

@Injectable()
export class OrderProcessOrchestrator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(ORDER_PORT) private readonly orderPort: OrderPort,
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort,
    @Inject(SHIFT_PORT) private readonly shiftPort: ShiftPort,
    @Inject(CUSTOMER_PORT) private readonly customerPort: CustomerPort,
    @Inject(CART_PORT) private readonly cartPort: CartPort,
    @Inject(SHOP_PRODUCT_PORT) private readonly shopProductPort: ShopProductPort,
    @Inject(FINANCE_PROCESS_ORCHESTRATOR) private readonly financeOrchestrator: FinanceProcessOrchestrator,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ====================================================
  // CHECKOUT - Создание заказа из корзины
  // ====================================================
  async checkout(input: CheckoutInput): Promise<CheckoutResult> {
    const session = await this.connection.startSession();
    
    try {
      let result: CheckoutResult;
      
      await session.withTransaction(async () => {
        // 1. Получаем корзину клиента через CartPort
        const cart = await this.cartPort.getCart(
          new CartQueries.GetCartQuery(input.customerId, { populateProducts: true }),
          { session }
        );
        
        if (!cart || cart.products.length === 0) {
          throw DomainError.validation('Корзина пуста');
        }
        
        if (cart.selectedShop?.toString() !== input.shopId) {
          throw DomainError.validation('Магазин в корзине не совпадает с указанным');
        }

        // 2. Проверяем магазин
        const shop = await this.shopPort.getShop(
          { filter: { shopId: input.shopId } },
          { session }
        );
        
        if (!shop) {
          throw DomainError.notFound('Shop', input.shopId);
        }
        
        if (shop.status !== ShopEnums.ShopStatus.OPENED) {
          throw DomainError.invariant('Магазин закрыт', { shopStatus: shop.status });
        }

        // 3. Проверяем смену
        const currentShift = await this.shiftPort.getCurrentShiftOfShop(input.shopId, { session });
        
        if (!currentShift) {
          throw DomainError.invariant('У магазина нет открытой смены');
        }
        
        if (currentShift.status !== ShiftEnums.ShiftStatus.OPEN) {
          throw DomainError.invariant('Смена магазина не активна', { shiftStatus: currentShift.status });
        }

        // 4. Получаем продукты через ShopProductPort
        const cartProductIds = cart.products.map(p => p.shopProduct.toString());
        const shopProducts = await this.shopProductPort.getShopProductsByIds(
          new ShopProductQueries.GetShopProductsByIdsQuery(cartProductIds, { populateProduct: true }),
          { session }
        );
        
        const productMap = new Map(shopProducts.map(p => [p._id.toString(), p]));
        
        // 5. Подготовка данных для заказа
        const orderProducts: Array<{
          shopProductId: string;
          selectedQuantity: number;
          productName: string;
          price: number;
          category: string;
          measuringScale: string;
          cardImage: string | null;
        }> = [];
        
        let totalCartSum = 0;
        const stockAdjustments: Array<{ shopProductId: string; adjustment: number }> = [];
        
        for (const cartItem of cart.products) {
          const shopProduct = productMap.get(cartItem.shopProduct.toString());
          
          if (!shopProduct) {
            throw DomainError.notFound('ShopProduct', cartItem.shopProduct.toString());
          }
          
          // Проверяем наличие
          if (shopProduct.stockQuantity < cartItem.selectedQuantity) {
            throw DomainError.validation(
              `Недостаточно товара "${(shopProduct as any).product?.productName}"`,
              { 
                available: shopProduct.stockQuantity, 
                requested: cartItem.selectedQuantity 
              }
            );
          }
          
          const product = (shopProduct as any).product;
          const itemSum = product.price * cartItem.selectedQuantity;
          totalCartSum += itemSum;
          
          orderProducts.push({
            shopProductId: shopProduct._id.toString(),
            selectedQuantity: cartItem.selectedQuantity,
            productName: product.productName,
            price: product.price,
            category: product.category,
            measuringScale: product.measuringScale,
            cardImage: product.cardImage?.toString() || null,
          });
          
          // Собираем корректировки остатков
          stockAdjustments.push({
            shopProductId: shopProduct._id.toString(),
            adjustment: -cartItem.selectedQuantity,
          });
        }

        // 6. Проверяем минимальную сумму заказа
        if (shop.minOrderSum && totalCartSum < shop.minOrderSum) {
          throw DomainError.validation(
            `Минимальная сумма заказа ${shop.minOrderSum}₽`,
            { minOrderSum: shop.minOrderSum, currentSum: totalCartSum }
          );
        }

        // 7. Рассчитываем финансы
        const deliveryPrice = cart.deliveryInfo?.price || DEFAULT_DELIVERY_PRICE;
        const systemTax = Math.round(totalCartSum * DEFAULT_SYSTEM_TAX);
        const usedBonusPoints = 0; // TODO: Implement bonus points when available
        const sentSum = totalCartSum - usedBonusPoints;
        const totalSum = sentSum + deliveryPrice;

        // 8. Резервируем товары через ShopProductPort
        await this.shopProductPort.bulkAdjustStockQuantity(
          new ShopProductCommands.BulkAdjustStockQuantityCommand(stockAdjustments),
          { session }
        );

        // 9. Создаём заказ
        const deliveryAddress = `${input.deliveryAddress.city}, ${input.deliveryAddress.street}, ${input.deliveryAddress.house}`;
        
        const order = await this.orderPort.createOrder(
          {
            payload: {
              customerId: input.customerId,
              shopId: input.shopId,
              shiftId: currentShift._id.toString(),
              products: orderProducts.map(p => ({
                shopProductId: p.shopProductId,
                selectedQuantity: p.selectedQuantity,
              })),
              delivery: {
                address: deliveryAddress,
                price: deliveryPrice,
                time: DEFAULT_DELIVERY_TIME,
              },
              finances: {
                totalCartSum,
                sentSum,
                deliveryPrice,
                systemTax,
                usedBonusPoints,
                totalSum,
              },
              customerComment: input.customerComment,
              metadata: {
                source: input.source,
              },
            },
          },
          { session }
        );

        // 10. Обновляем заказ с полной информацией о продуктах
        await this.updateOrderWithProductDetails(
          order._id.toString(), 
          orderProducts, 
          {
            customerName: input.customerName,
            shopName: shop.shopName,
            shopImage: shop.shopImage?.toString() || '',
          }, 
          session
        );

        // 11. Очищаем корзину через CartPort
        await this.cartPort.clearCart(
          new CartCommands.ClearCartCommand(input.customerId),
          { session }
        );

        // 12. Обновляем статистику смены
        await this.shiftPort.updateStatistics(
          {
            shiftId: currentShift._id.toString(),
            payload: {
              ordersCount: 1,
              totalIncome: sentSum,
            },
          },
          { session }
        );

        result = {
          orderId: order._id.toString(),
          orderStatus: order.orderStatus,
          totalSum,
          deliveryPrice,
          estimatedDeliveryTime: DEFAULT_DELIVERY_TIME,
          products: orderProducts.map(p => ({
            shopProductId: p.shopProductId,
            productName: p.productName,
            quantity: p.selectedQuantity,
            price: p.price,
            subtotal: p.price * p.selectedQuantity,
          })),
        };
      });

      // Emit event after transaction
      this.eventEmitter.emit('order.created', {
        orderId: result!.orderId,
        customerId: input.customerId,
        shopId: input.shopId,
        totalSum: result!.totalSum,
      });

      return result!;
    } finally {
      await session.endSession();
    }
  }

  // ====================================================
  // ACCEPT ORDER - Принятие заказа в работу
  // ====================================================
  async acceptOrder(input: AcceptOrderInput): Promise<void> {
    const session = await this.connection.startSession();
    
    try {
      await session.withTransaction(async () => {
        const order = await this.orderPort.getOrder(
          { orderId: input.orderId },
          { session }
        );
        
        if (!order) {
          throw DomainError.notFound('Order', input.orderId);
        }

        if (order.orderStatus !== OrderEnums.OrderStatus.PENDING) {
          throw DomainError.invariant(
            `Нельзя принять заказ в статусе ${order.orderStatus}`,
            { currentStatus: order.orderStatus }
          );
        }

        await this.orderPort.acceptOrder(
          {
            orderId: input.orderId,
            payload: {
              employeeId: input.employeeId,
              employeeName: input.employeeName,
            },
          },
          { session }
        );
      });

      this.eventEmitter.emit('order.accepted', {
        orderId: input.orderId,
        employeeId: input.employeeId,
      });
    } finally {
      await session.endSession();
    }
  }

  // ====================================================
  // COMPLETE ASSEMBLY - Завершение сборки с расчётом недовеса
  // ====================================================
  async completeAssembly(input: CompleteAssemblyInput): Promise<AssemblyResult> {
    const session = await this.connection.startSession();
    
    try {
      let result: AssemblyResult;
      
      await session.withTransaction(async () => {
        const order = await this.orderPort.getOrder(
          { orderId: input.orderId, options: { populateProducts: true } },
          { session }
        );
        
        if (!order) {
          throw DomainError.notFound('Order', input.orderId);
        }

        if (order.orderStatus !== OrderEnums.OrderStatus.ASSEMBLING) {
          throw DomainError.invariant(
            `Нельзя завершить сборку заказа в статусе ${order.orderStatus}`,
            { currentStatus: order.orderStatus }
          );
        }

        // Рассчитываем компенсации по весу
        const compensations = this.calculateWeightCompensations(
          order.products,
          input.actualProducts
        );

        const totalCompensation = compensations.reduce((sum, c) => sum + c.bonusPoints, 0);
        const totalPriceDiff = compensations.reduce((sum, c) => sum + c.priceDifference, 0);

        const actualProductsWithBonus = input.actualProducts.map(ap => {
          const compensation = compensations.find(c => c.shopProductId === ap.shopProductId);
          return {
            shopProductId: ap.shopProductId,
            actualQuantity: ap.actualQuantity,
            weightCompensationBonus: compensation?.bonusPoints || 0,
          };
        });

        await this.orderPort.completeAssembly(
          {
            orderId: input.orderId,
            payload: {
              employeeId: input.employeeId,
              employeeName: input.employeeName,
              actualProducts: actualProductsWithBonus,
            },
          },
          { session }
        );

        // Корректируем остатки при недовесе через ShopProductPort
        const stockAdjustments: Array<{ shopProductId: string; adjustment: number }> = [];
        for (const comp of compensations) {
          if (comp.compensationType === 'underweight') {
            const diff = comp.selectedQuantity - comp.actualQuantity;
            stockAdjustments.push({
              shopProductId: comp.shopProductId,
              adjustment: diff, // Возвращаем разницу на склад
            });
          }
        }
        
        if (stockAdjustments.length > 0) {
          await this.shopProductPort.bulkAdjustStockQuantity(
            new ShopProductCommands.BulkAdjustStockQuantityCommand(stockAdjustments),
            { session }
          );
        }

        result = {
          orderId: input.orderId,
          orderStatus: OrderEnums.OrderStatus.AWAITING_COURIER,
          totalWeightCompensationBonus: totalCompensation,
          adjustedTotalSum: order.finances.totalSum - totalPriceDiff,
        };
      });

      this.eventEmitter.emit('order.assembly.completed', {
        orderId: input.orderId,
        employeeId: input.employeeId,
        totalCompensation: result!.totalWeightCompensationBonus,
      });

      return result!;
    } finally {
      await session.endSession();
    }
  }

  // ====================================================
  // HAND TO COURIER - Передача курьеру
  // ====================================================
  async handToCourier(input: HandToCourierInput): Promise<void> {
    const session = await this.connection.startSession();
    
    try {
      await session.withTransaction(async () => {
        const order = await this.orderPort.getOrder(
          { orderId: input.orderId },
          { session }
        );
        
        if (!order) {
          throw DomainError.notFound('Order', input.orderId);
        }

        if (order.orderStatus !== OrderEnums.OrderStatus.AWAITING_COURIER) {
          throw DomainError.invariant(
            `Нельзя передать курьеру заказ в статусе ${order.orderStatus}`,
            { currentStatus: order.orderStatus }
          );
        }

        await this.orderPort.handToCourier(
          {
            orderId: input.orderId,
            payload: {
              employeeId: input.employeeId,
              employeeName: input.employeeName,
              courierInfo: input.courierInfo,
            },
          },
          { session }
        );
      });

      this.eventEmitter.emit('order.handed.to.courier', {
        orderId: input.orderId,
      });
    } finally {
      await session.endSession();
    }
  }

  // ====================================================
  // DELIVER ORDER - Доставка заказа
  // ====================================================
  /**
   * Доставка заказа:
   * 1. Обновляет статус заказа на DELIVERED
   * 2. Записывает доход в SettlementPeriod через FinanceProcessOrchestrator
   * 3. Обновляет статистику смены
   */
  async deliverOrder(input: DeliverOrderInput): Promise<DeliveryResult> {
    const session = await this.connection.startSession();
    
    try {
      let result: DeliveryResult;
      let orderForFinance: Order;
      
      await session.withTransaction(async () => {
        const order = await this.orderPort.getOrder(
          { orderId: input.orderId },
          { session }
        );
        
        if (!order) {
          throw DomainError.notFound('Order', input.orderId);
        }

        if (order.orderStatus !== OrderEnums.OrderStatus.IN_DELIVERY) {
          throw DomainError.invariant(
            `Нельзя доставить заказ в статусе ${order.orderStatus}`,
            { currentStatus: order.orderStatus }
          );
        }

        // Сохраняем данные заказа для финансовой записи
        orderForFinance = order;

        await this.orderPort.deliverOrder(
          { orderId: input.orderId },
          { session }
        );

        const deliveredAt = new Date();

        await this.shiftPort.updateStatistics(
          {
            shiftId: order.shift.toString(),
            payload: {
              deliveredOrdersCount: 1,
            },
          },
          { session }
        );

        result = {
          orderId: input.orderId,
          orderStatus: OrderEnums.OrderStatus.DELIVERED,
          deliveredAt,
        };
      });

      // После успешной транзакции записываем доход в финансы
      // Это делается отдельно, т.к. financeOrchestrator использует свою транзакцию
      try {
        // Получаем shop для shopAccountId
        const shop = await this.shopPort.getShop({
          filter: { shopId: orderForFinance!.orderedFrom.shop.toString() }
        });
        
        if (shop && shop.account) {
          await this.financeOrchestrator.recordOrderIncome({
            shopAccountId: shop.account.toString(),
            orderId: input.orderId,
            orderAmount: orderForFinance!.finances.sentSum,
            commissionAmount: orderForFinance!.finances.systemTax,
          });
        }
      } catch (financeError) {
        // Логируем ошибку, но не откатываем доставку
        // Финансовая запись может быть добавлена вручную
        console.error('[OrderProcess] Failed to record order income:', financeError);
        this.eventEmitter.emit('order.finance.error', {
          orderId: input.orderId,
          error: financeError.message,
        });
      }

      this.eventEmitter.emit('order.delivered', {
        orderId: input.orderId,
        deliveredAt: result!.deliveredAt,
      });

      return result!;
    } finally {
      await session.endSession();
    }
  }

  // ====================================================
  // CANCEL ORDER - Отмена заказа клиентом
  // ====================================================
  async cancelOrder(input: CancelOrderInput): Promise<void> {
    const session = await this.connection.startSession();
    
    try {
      await session.withTransaction(async () => {
        const order = await this.orderPort.getOrder(
          { orderId: input.orderId },
          { session }
        );
        
        if (!order) {
          throw DomainError.notFound('Order', input.orderId);
        }

        // Бизнес-проверка: заказ можно отменить только до начала сборки
        if (order.orderStatus !== OrderEnums.OrderStatus.PENDING) {
          throw DomainError.invariant(
            'Заказ можно отменить только до начала сборки',
            { currentStatus: order.orderStatus }
          );
        }

        await this.orderPort.cancelOrder(
          {
            orderId: input.orderId,
            payload: {
              reason: input.reason as OrderEnums.OrderCancelReason,
              canceledBy: {
                type: input.canceledBy.type as OrderEnums.OrderEventActorType,
                id: input.canceledBy.id,
                name: input.canceledBy.name,
              },
              comment: input.comment,
            },
          },
          { session }
        );

        // Возвращаем товары на склад через ShopProductPort
        const stockAdjustments = order.products.map(product => ({
          shopProductId: product.shopProduct.toString(),
          adjustment: product.selectedQuantity,
        }));
        
        await this.shopProductPort.bulkAdjustStockQuantity(
          new ShopProductCommands.BulkAdjustStockQuantityCommand(stockAdjustments),
          { session }
        );

        await this.shiftPort.updateStatistics(
          {
            shiftId: order.shift.toString(),
            payload: {
              canceledOrdersCount: 1,
            },
          },
          { session }
        );
      });

      this.eventEmitter.emit('order.cancelled', {
        orderId: input.orderId,
        reason: input.reason,
      });
    } finally {
      await session.endSession();
    }
  }

  // ====================================================
  // DECLINE ORDER - Отклонение заказа магазином
  // ====================================================
  async declineOrder(input: DeclineOrderInput): Promise<void> {
    const session = await this.connection.startSession();
    
    try {
      await session.withTransaction(async () => {
        const order = await this.orderPort.getOrder(
          { orderId: input.orderId },
          { session }
        );
        
        if (!order) {
          throw DomainError.notFound('Order', input.orderId);
        }

        const allowedStatuses = [
          OrderEnums.OrderStatus.PENDING,
          OrderEnums.OrderStatus.ASSEMBLING,
          OrderEnums.OrderStatus.AWAITING_COURIER,
        ];
        
        if (!allowedStatuses.includes(order.orderStatus)) {
          throw DomainError.invariant(
            'Заказ нельзя отклонить на этом этапе',
            { currentStatus: order.orderStatus }
          );
        }

        await this.orderPort.declineOrder(
          {
            orderId: input.orderId,
            payload: {
              reason: input.reason as OrderEnums.OrderDeclineReason,
              declinedBy: {
                type: input.declinedBy.type as OrderEnums.OrderEventActorType,
                id: input.declinedBy.id,
                name: input.declinedBy.name,
              },
              comment: input.comment,
            },
          },
          { session }
        );

        // Возвращаем товары на склад через ShopProductPort
        const stockAdjustments = order.products.map(product => ({
          shopProductId: product.shopProduct.toString(),
          adjustment: product.actualQuantity ?? product.selectedQuantity,
        }));
        
        await this.shopProductPort.bulkAdjustStockQuantity(
          new ShopProductCommands.BulkAdjustStockQuantityCommand(stockAdjustments),
          { session }
        );

        await this.shiftPort.updateStatistics(
          {
            shiftId: order.shift.toString(),
            payload: {
              declinedOrdersCount: 1,
              declinedIncome: order.finances.sentSum,
            },
          },
          { session }
        );
      });

      this.eventEmitter.emit('order.declined', {
        orderId: input.orderId,
        reason: input.reason,
      });
    } finally {
      await session.endSession();
    }
  }

  // ====================================================
  // SET RATING - Оценка заказа
  // ====================================================
  async setRating(input: SetRatingInput): Promise<void> {
    // Проверяем заказ
    const order = await this.orderPort.getOrder({ orderId: input.orderId });
    
    if (!order) {
      throw DomainError.notFound('Order', input.orderId);
    }

    // Бизнес-проверка: заказ должен быть доставлен
    if (order.orderStatus !== OrderEnums.OrderStatus.DELIVERED) {
      throw DomainError.invariant('Можно оценить только доставленный заказ', {
        currentStatus: order.orderStatus,
      });
    }

    // Бизнес-проверка: заказ ещё не оценён
    if (order.rating?.settedRating) {
      throw DomainError.invariant('Заказ уже оценён');
    }

    await this.orderPort.setOrderRating({
      orderId: input.orderId,
      payload: {
        customerId: input.customerId,
        customerName: input.customerName,
        rating: input.rating,
        tags: input.tags || [],
        comment: input.comment,
      },
    });

    this.eventEmitter.emit('order.rated', {
      orderId: input.orderId,
      rating: input.rating,
    });
  }

  // ====================================================
  // PRIVATE HELPERS
  // ====================================================

  private calculateWeightCompensations(
    orderProducts: Order['products'],
    actualProducts: CompleteAssemblyInput['actualProducts']
  ): WeightCompensationResult[] {
    const results: WeightCompensationResult[] = [];

    for (const actual of actualProducts) {
      const ordered = orderProducts.find(
        p => p.shopProduct.toString() === actual.shopProductId
      );

      if (!ordered) continue;

      const selectedQty = ordered.selectedQuantity;
      const actualQty = actual.actualQuantity;
      const price = ordered.price;
      const minAcceptableQty = selectedQty * DEFAULT_MIN_WEIGHT_DIFFERENCE_PERCENTAGE;

      let compensationType: 'underweight' | 'overweight' | 'exact' = 'exact';
      let priceDifference = 0;
      let bonusPoints = 0;

      if (actualQty < minAcceptableQty) {
        compensationType = 'underweight';
        const diff = selectedQty - actualQty;
        priceDifference = diff * price;
        bonusPoints = Math.round(priceDifference);
      } else if (actualQty < selectedQty) {
        compensationType = 'exact';
      } else if (actualQty > selectedQty) {
        compensationType = 'overweight';
      }

      results.push({
        shopProductId: actual.shopProductId,
        selectedQuantity: selectedQty,
        actualQuantity: actualQty,
        priceDifference,
        bonusPoints,
        compensationType,
      });
    }

    return results;
  }

  private async updateOrderWithProductDetails(
    orderId: string,
    products: Array<{
      shopProductId: string;
      productName: string;
      price: number;
      category: string;
      measuringScale: string;
      cardImage: string | null;
    }>,
    orderInfo: {
      customerName: string;
      shopName: string;
      shopImage: string;
    },
    session: any
  ): Promise<void> {
    const OrderModel = this.connection.model('Order');
    
    const updateOperations: Record<string, any> = {
      'orderedBy.customerName': orderInfo.customerName,
      'orderedFrom.shopName': orderInfo.shopName,
      'orderedFrom.shopImage': orderInfo.shopImage,
    };

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      updateOperations[`products.${i}.productName`] = p.productName;
      updateOperations[`products.${i}.price`] = p.price;
      updateOperations[`products.${i}.category`] = p.category;
      updateOperations[`products.${i}.measuringScale`] = p.measuringScale;
      if (p.cardImage) {
        updateOperations[`products.${i}.cardImage`] = new Types.ObjectId(p.cardImage);
      }
    }

    await OrderModel.updateOne(
      { _id: new Types.ObjectId(orderId) },
      { $set: updateOperations },
      { session }
    );
  }
}
