import { Injectable, Inject, forwardRef, NotFoundException, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { ShopProduct } from "src/modules/shop/schemas/shop-product.schema";
import { Shop } from "src/modules/shop/schemas/shop.schema";
import { Customer } from "src/modules/customer/schemas/customer.schema";
import {
  CreateOrderDto,
  CancelOrderDto,
  RateTheOrderDto,
} from "./order.customer.request.dto";
import {
  OrderFullResponseDto,
  OrderPreviewResponseDto,
  OrderCreatedResponseDto,
  RateTheOrderResponseDto
} from "./order.customer.response.dto";

import { checkId, verifyUserStatus,  } from "src/common/utils";
import { Order, OrderProduct } from '../order.schema';
import { Product } from "src/modules/product/product.schema";
import { CartCustomerService } from 'src/modules/customer/customer/cart.customer.service';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import {OrderStatus} from 'src/modules/order/order.schema'
import { transformOrderToPreview } from './utils';
import {AuthenticatedUser} from 'src/common/types';
import { SYSTEM_TAX } from 'src/common/constants';
import { Shift } from 'src/modules/shop/schemas/shift.schema';

@Injectable()
export class OrderCustomerService {
  constructor(
    @InjectModel('Customer') private customerModel: Model<Customer>,
    @InjectModel('ShopProduct') private shopProductModel: Model<ShopProduct>,
    @InjectModel('Shop') private shopModel: Model<Shop>,
    @InjectModel('Order') private orderModel: Model<Order>,
    @InjectModel('Shift') private shiftModel: Model<Shift>,

    private cartCustomerService: CartCustomerService,
    private logsService: LogsService,
    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService
  ) {}

  // ====================================================
  // ORDERS 
  // ====================================================

  //TODO: добавить сессии с логгированием
  async createOrder(authedCustomer: AuthenticatedUser, dto: CreateOrderDto): Promise<OrderCreatedResponseDto> {
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    
    // Логирование начала оформления заказа
    let orderId: string;
    if (customer._id.toString() !== authedCustomer.id) throw new UnauthorizedException('Недостаточно прав');
    verifyUserStatus(customer);
    
    checkId([dto.shopId]);
    const shop = await this.shopModel.findById(new Types.ObjectId(dto.shopId)).exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    if (!shop.currentShift) throw new NotFoundException('В магазине нет активной смены');
    
    // Преобразование ID смены в строку, а затем в ObjectId для безопасного поиска
    const currentShiftId = shop.currentShift instanceof Types.ObjectId 
      ? shop.currentShift 
      : new Types.ObjectId(shop.currentShift.toString());
      
    const shopShift = await this.shiftModel.findById(currentShiftId).exec();
    if (!shopShift) throw new NotFoundException('Смена не найдена');
    if (shopShift.closedAt) throw new NotFoundException('Смена завершена');

    // Проверка адреса
    checkId([dto.customerAddressId]);
    const deliveryAddress = customer.savedAddresses.find(a => a._id.toString() === dto.customerAddressId);
    if (!deliveryAddress) throw new NotFoundException('Адрес не найден');
    

    const cart = await this.cartCustomerService.validateAndUpdateCart(authedCustomer.id);
    if (!cart) throw new NotFoundException('Корзина не найдена');
    if (!cart.isReadyToOrder) throw new BadRequestException('Корзина не готова к оформлению');
    
    // Проверка соответствия DTO и корзины
    if (!cart.selectedShop || cart.selectedShop.toString() !== dto.shopId) throw new BadRequestException('Выбранный магазин не соответствует магазину в корзине');
    
    // Проверка, что товары в DTO соответствуют товарам в корзине
    const cartProductIds = cart.products.map(p => p.shopProduct.toString());
    const dtoProductIds = dto.products.map(p => p.shopProductId);
    
    // Проверяем, что все товары из DTO есть в корзине
    for (const productId of dtoProductIds) {
      if (!cartProductIds.includes(productId)) throw new BadRequestException(`Товар ${productId} отсутствует в корзине`);
    }
    
    // Проверяем, что в корзине нет лишних товаров, которых нет в DTO
    if (cartProductIds.length !== dtoProductIds.length) throw new BadRequestException('Количество товаров в корзине не соответствует запросу');
    
    // Проверяем количество товаров
    for (const dtoProduct of dto.products) {
      const cartProduct = cart.products.find(p => p.shopProduct.toString() === dtoProduct.shopProductId);
      if (cartProduct && cartProduct.selectedQuantity !== dtoProduct.selectedQuantity) {
        throw new BadRequestException(
          `Количество товара ${dtoProduct.shopProductId} не соответствует количеству в корзине`
        );
      }
    }
    
    //TODO: добавить проверку общей суммы
    // Проверка общей суммы, если она есть в DTO
    if (dto.expectedTotalPrice && Math.floor(dto.expectedTotalPrice) !== Math.floor(cart.totalSum)) throw new BadRequestException('Сумма заказа изменилась. Пожалуйста, обновите страницу');

    //TODO: добавиить проверку с дастависта
    //TODO: добавиить проверку по финанасам

    
    // Оптимизированное получение всех товаров за один запрос
    if (dto.products.length === 0) throw new BadRequestException('Нет товаров для заказа');
    
    // Создаем массив ID товаров для запроса
    const productIds = dto.products.map(p => new Types.ObjectId(p.shopProductId));
    
    // Получаем все товары одним запросом
    const shopProducts = await this.shopProductModel.find({
      _id: { $in: productIds }
    })
    .select('_id shopProductId pinnedTo product stockQuantity status')
    .populate('product', 'productName category cardImage price measuringScale')
    .lean({ virtuals: true }).exec();
    
    // Создаем Map для быстрого доступа к продуктам по ID
    const shopProductsMap = new Map<string, ShopProduct & {product: Product}>();
    shopProducts.forEach(sp => {
      shopProductsMap.set(sp._id.toString(), sp as unknown as ShopProduct & {product: Product});
    });
    
    // Формируем список продуктов для заказа
    const orderProducts: OrderProduct[] = [];
    
    // Используем готовую сумму из корзины
    const totalCartSum = cart.totalSum;
    
    // Проверяем и формируем список товаров
    for (const item of dto.products) {
      const foundProduct = shopProductsMap.get(item.shopProductId);
      
      if (!foundProduct) throw new NotFoundException(`Товар ${item.shopProductId} не найден`);

      // Эту проверку можно убрать, так как мы уже проверили, что магазины совпадают
      // Но оставим для дополнительной проверки
      if (foundProduct.pinnedTo.toString() !== dto.shopId) throw new BadRequestException(`Товар ${item.shopProductId} не принадлежит указанному магазину`);
      
      if (foundProduct.stockQuantity < item.selectedQuantity) throw new BadRequestException(`Товар ${foundProduct.product.productName} недоступен в запрошенном количестве`);
      
      // Добавляем товар в список
      orderProducts.push({
        shopProduct: foundProduct._id,
        category: foundProduct.product.category,
        productName: foundProduct.product.productName,
        price: foundProduct.product.price,
        cardImage: foundProduct.product.cardImage || null,
        measuringScale: foundProduct.product.measuringScale,
        selectedQuantity: item.selectedQuantity,
        actualQuantity: null,
        weightCompensationBonus: 0
      });
    }
    
    // Расчет финансов
    //TODO: добавиить расчет доставки
    const deliveryPrice = 150; // Заглушка, можно рассчитывать по расстоянию
    const systemTax = totalCartSum * SYSTEM_TAX;
    const totalAmount = totalCartSum + deliveryPrice + systemTax - (dto.usedBonusPoints || 0);
    //todo добавить фин расчет

    // Создаем заказ
    const newOrder = await this.orderModel.create({
      customer: customer._id,
      shop: new Types.ObjectId(dto.shopId),
      orderStatus: OrderStatus.PENDING,
      shift: shopShift._id,
      orderedAt: new Date(),
      orderedBy: {
        customer: customer._id,
        customerName: customer.customerName
      },
      orderedFrom: {
        shop: shop._id,
        shopName: shop.shopName,
        shopImage: shop.shopImage
      },
      handledBy: null,
      delivery: {
        deliveryAddress: deliveryAddress.street,
        deliveryPrice: deliveryPrice,
        deliveryTime: 60 // 60 минут, заглушка
      },
      comment: dto.comment || '',
      expectedDeliveryDate: dto.expectedDeliveryPrice || null,
      finances: {
        totalCartSum: totalCartSum,
        sentSum: 0,
        deliveryPrice: deliveryPrice,
        systemTax: systemTax,
        totalWeightCompensationBonus: 0,
        usedBonusPoints: dto.usedBonusPoints || 0,
        totalSum: totalAmount
      },
      rating: {
        settedRating: 0,
        feedbackAt: null,
        feedbackTags: [],
        feedbackComment: ''
      },
      products: orderProducts
    });

    customer.activeOrders.push(newOrder._id);
    await customer.save();
    
    // TODO: добавить проверку, что заказ не добавлен в активные заказы магазина
    shop.activeOrders.push(newOrder._id as unknown as Types.ObjectId & Order);
    await shop.save();

    
    // Логирование создания заказа
    orderId = newOrder._id.toString();
    await this.logsService.addOrderLog(orderId, LogLevel.MEDIUM,
      `Создан новый заказ на сумму ${totalAmount} руб. от клиента ${customer.customerName}`
    );

    await this.logsService.addShiftLog(shopShift._id.toString(), LogLevel.MEDIUM,
      `Добавлен новый заказ (${orderId}) на сумму ${totalAmount} руб.`
    );

    // Обновляем остатки товаров (уменьшаем количество) одним запросом
    // const bulkOps = dto.products.map(item => ({
    //   updateOne: {
    //     filter: { _id: new Types.ObjectId(item.shopProductId) },
    //     update: { $inc: { stockQuantity: -item.selectedQuantity } }
    //   }
    // }));
    
    // if (bulkOps.length > 0) await this.shopProductModel.bulkWrite(bulkOps);
    
    // Очищаем корзину после создания заказа
    await this.cartCustomerService.unselectShopForCart(authedCustomer);
    

    // Отправка уведомления клиенту
    await this.notificationService.notifyCustomerAboutOrderUpdate(orderId);
    await this.notificationService.notifyEmployeeAboutNewOrder(orderId);
    // Возвращаем ID созданного заказа
    return plainToInstance(OrderCreatedResponseDto, { orderId: newOrder._id.toString() }, { excludeExtraneousValues: true });
  }


  async getFullOrder(authedCustomer: AuthenticatedUser, orderId: string): Promise<OrderFullResponseDto> {
    checkId([orderId]);
    // Проверяем существование клиента
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    // Находим заказ и проверяем, что он принадлежит клиенту
    const order = await this.orderModel.findById(new Types.ObjectId(orderId))
      .populate('orderedFrom.shop', 'shopName shopImage shopId shopOrdersCount avgRating ratingsCount')
      .lean({ virtuals: true })
      .exec();
    
    if (!order) throw new NotFoundException(`Заказ ${orderId} не найден`);
    
    // Проверка, что заказ принадлежит данному пользователю
    if (order.orderedBy?.customer?.toString() !== authedCustomer.id) throw new ForbiddenException('У вас нет доступа к этому заказу');
    
    // Преобразуем данные для возврата клиенту
    return plainToInstance(OrderFullResponseDto, order, { excludeExtraneousValues: true });
  }
  

  async cancelOrder(authedCustomer: AuthenticatedUser, orderId: string, dto: CancelOrderDto): Promise<OrderFullResponseDto> {
    checkId([orderId]);
    
    // Проверяем существование клиента
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    
    // Логирование начала процесса отмены заказа
    await this.logsService.addOrderLog(orderId, LogLevel.MEDIUM,
      `Начат процесс отмены заказа пользователем ID: ${authedCustomer.id}, имя: ${customer.customerName}`
    );
    
    // Находим заказ
    const order = await this.orderModel.findById(new Types.ObjectId(orderId)).exec();
    if (!order) throw new NotFoundException(`Заказ ${orderId} не найден`);
    
    // Проверяем, что заказ принадлежит клиенту
    if (order.orderedBy?.customer?.toString() !== authedCustomer.id) throw new ForbiddenException('У вас нет доступа к этому заказу');
    
    // Проверяем, что заказ можно отменить
    const cancelableStatuses = [OrderStatus.PENDING, OrderStatus.PREPARING];
    if (!cancelableStatuses.includes(order.orderStatus)) throw new BadRequestException(`Невозможно отменить заказ в статусе ${order.orderStatus}`);
    
    // Обновляем заказ - устанавливаем статус и причину отмены
    order.orderStatus = OrderStatus.CANCELLED;
    order.canceledAt = new Date();
    order.canceledReason = dto.cancelReason;
    order.canceledComment = dto.cancelComment ?? null;
    
    // Логирование информации о причине отмены
    await this.logsService.addOrderLog(orderId, LogLevel.MEDIUM,
      `Заказ отменен пользователем ID: ${authedCustomer.id}, имя: ${customer.customerName}. Причина: ${dto.cancelReason}${dto.cancelComment ? `, комментарий: ${dto.cancelComment}` : ''}`
    );
    
    
    // Возвращаем товары на склад магазина
    const bulkOps = order.products.map(item => ({
      updateOne: {
        filter: { _id: item.shopProduct },
        update: { $inc: { stockQuantity: item.selectedQuantity } }
      }
    }));
    
    // Выполняем обновление количества товаров на складе
    if (bulkOps.length > 0) {
      await this.shopProductModel.bulkWrite(bulkOps);
      await this.logsService.addOrderLog(orderId, LogLevel.LOW,
        `Обновлены остатки для ${bulkOps.length} товаров`
      );
    }
    
    // Сохраняем обновленный заказ
    await order.save();

    // Удаляем заказ из активных заказов клиента
    customer.activeOrders = customer.activeOrders.filter(id => id.toString() !== order._id.toString());
    await customer.save();
    
    // Логирование завершения процесса отмены заказа
    await this.logsService.addOrderLog(orderId, LogLevel.LOW,
      `Процесс отмены заказа завершен. Товары возвращены на склад.`
    );

    this.notificationService.notifyCustomerAboutOrderUpdate(orderId);
    
    // Возвращаем обновленный заказ
    return this.getFullOrder(authedCustomer, orderId);
  }

  
  async getOrders(authedCustomer: AuthenticatedUser): Promise<OrderPreviewResponseDto[]> {
    // Проверка существования клиента
    const customer = await this.customerModel.findById(authedCustomer.id).lean().exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    
    // Получение всех заказов пользователя и сортировка по дате создания (новые сначала)
    type PopulatedOrder = Order & { shop: { shopName: string, shopImage: Types.ObjectId } };
    
    // Ищем по полю customer внутри orderedBy и НЕ используем populate
    // т.к. shop уже есть в объекте orderedFrom
    const orders = await this.orderModel.find({ 'orderedBy.customer': customer._id })
      // Убираем populate, т.к. shop нет на верхнем уровне схемы
      .sort({ orderedAt: -1 })
      .lean({ virtuals: true }).exec();

    // Безопасное приведение типов
    const typedOrders = orders as unknown as PopulatedOrder[];
    
    // Преобразование данных для клиентской части
    return typedOrders.map(order => {
      return plainToInstance(OrderPreviewResponseDto, order, { excludeExtraneousValues: true });
    });
  }


  async getActiveOrderForCustomerBot(telegramId: number): Promise<Order[]> {
    const customer = await this.customerModel.findOne({ telegramId }).lean().exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    // Получение всех заказов пользователя и сортировка по дате создания (новые сначала)
    type PopulatedOrder = Order & { shop: { shopName: string, shopImage: Types.ObjectId } };
    const activeStatuses = [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.DELIVERING];
    
    const orders = await this.orderModel.find({
      'orderedBy.customer': customer._id,
      orderStatus: { $in: activeStatuses }
    })
      .populate('orderedFrom', 'shopName shopImage')
      .sort({ orderedAt: -1 })
      .lean({ virtuals: true }).exec();
      
    // Безопасное приведение типов
    const typedOrders = orders as unknown as PopulatedOrder[];

    if (typedOrders.length === 0) return [];


    // Преобразование данных для клиентской части
    return typedOrders.map(order => plainToInstance(Order, transformOrderToPreview(order), { excludeExtraneousValues: true }));
  }


  async getActiveOrders(authedCustomer: AuthenticatedUser): Promise<OrderFullResponseDto[]> {
    // Проверка существования клиента
    const customer = await this.customerModel.findById(authedCustomer.id).lean().exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    
    // Проверка статуса верификации
    // verifyUserStatus(customer);
    
    // Определим статусы, которые считаются активными
    const activeStatuses = [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.DELIVERING];
    
    // Получаем только активные заказы, используя такой же запрос, как и в getOrders,
    // но с дополнительным фильтром по статусу
    const orders = await this.orderModel.find({
      'orderedBy.customer': customer._id,
      orderStatus: { $in: activeStatuses }
    })
      // Убираем populate для shop, т.к. его нет на верхнем уровне схемы
      // .populate('shop', 'shopName shopImage')
      // Но возвращаем populate для продуктов, чтобы получить информацию о категории товара
      .populate({
        path: 'products.shopProduct',
        populate: {
          path: 'product',
          model: 'Product'
        }
      })
      .sort({ orderedAt: -1 })
      .lean({ virtuals: true }).exec();
    
    // Приведение типов - используем unknown для безопасного приведения типов
    const typedOrders = orders as unknown as (Order & {
      customer: Types.ObjectId,
      shop: Shop & { _id: Types.ObjectId },
      products: (OrderProduct & {
        shopProduct: {
          _id: Types.ObjectId,
          product: {
            category: string,
            name: string,
            cardImage: string,
            measuringScale: string
          }
        }
      })[]
    })[];
    
    // Преобразование данных в DTO формат
    return typedOrders.map(order => {
      return plainToInstance(OrderFullResponseDto, {
        orderId: order._id.toString(),
        products: order.products.map(prod => {
          // Безопасное приведение типов для доступа к вложенным свойствам
          const typedProd = prod as unknown as (OrderProduct & {
            shopProduct: {
              _id: Types.ObjectId,
              product: {
                category: string,
                name: string,
                cardImage: string,
                measuringScale: string
              }
            }
          });
          return {
            shopProduct: typedProd.shopProduct._id.toString(),
            category: typedProd.shopProduct.product.category,
            productName: typedProd.shopProduct.product.name,
            price: typedProd.price,
            cardImage: typedProd.shopProduct.product.cardImage,
            measuringScale: typedProd.shopProduct.product.measuringScale,
            selectedQuantity: typedProd.selectedQuantity,
            actualQuantity: typedProd.actualQuantity,
            weightCompensationBonus: typedProd.weightCompensationBonus
          };
        })
      }, { excludeExtraneousValues: true });
    });
  }

  
  async setRating(authedCustomer: AuthenticatedUser, orderId: string, dto: RateTheOrderDto): Promise<RateTheOrderResponseDto> {
    const foundCustomer = await this.customerModel.findById(authedCustomer.id).lean().exec();
    if (!foundCustomer) throw new NotFoundException(`Клиент ${authedCustomer.id} не найден`);
    verifyUserStatus(foundCustomer);
    
    // Логирование начала процесса оценки заказа
    await this.logsService.addOrderLog(orderId, LogLevel.LOW,
      `Начат процесс оценки заказа пользователем ID: ${authedCustomer.id}, имя: ${foundCustomer.customerName}`
    );

    checkId([orderId]);
    const order = await this.orderModel.findById(orderId).lean({ virtuals: true }).exec();
    if (!order) throw new NotFoundException(`Заказ ${orderId} не найден`);
  
    // Проверка, что заказ принадлежит клиенту
    if (order.orderedBy?.customer?.toString() !== foundCustomer._id.toString()) throw new ForbiddenException('У вас нет доступа к этому заказу');
  
    // Проверка возможности оценить заказ
    if (order.orderStatus !== OrderStatus.DELIVERED) throw new BadRequestException('Можно оценить только доставленный заказ');
    
    // Проверка, не оценен ли заказ уже
    if (order.rating && order.rating.settedRating) throw new BadRequestException('Заказ уже оценен');
    
    // Логирование информации об оценке
    const ratingInfo = `Оценка: ${dto.settedRating} из 5` + 
      (dto.feedbackTags && dto.feedbackTags.length > 0 ? `, теги: ${dto.feedbackTags.join(', ')}` : '') +
      (dto.feedbackComment ? `, комментарий: ${dto.feedbackComment}` : '');
    
    await this.logsService.addOrderLog(orderId, LogLevel.MEDIUM,
      `Пользователь ID: ${authedCustomer.id}, имя: ${foundCustomer.customerName} оставил отзыв. ${ratingInfo}`
    );
    
    // Обновление заказа с оценкой
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      orderId,
      {
        rating: {
          settedRating: dto.settedRating,
          feedbackAt: new Date(),
          feedbackTags: dto.feedbackTags || [],
          feedbackComment: dto.feedbackComment
        }
      },
      { new: true } // Возвращает обновленный документ
    ).lean({ virtuals: true }).exec();
  
    // Логирование завершения процесса оценки
    await this.logsService.addOrderLog(orderId, LogLevel.LOW,
      `Процесс оценки заказа завершен. Оценка успешно сохранена.`
    );
    
    // Возвращаем обновленный заказ
    return plainToInstance(RateTheOrderResponseDto, updatedOrder?.rating, { excludeExtraneousValues: true });
  }

}