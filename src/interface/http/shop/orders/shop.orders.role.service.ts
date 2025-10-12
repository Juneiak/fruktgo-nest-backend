import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { ProductMeasuringScale } from "src/modules/product/product.schema";

import { ShopModel } from 'src/modules/shop/shop.schema';
import { OrderModel, OrderStatus } from 'src/modules/order/order.schema';
import {
  DeclineOrderByEmployeeDto,
  PrepareOrderProductByEmployeeDto,
  HandOrderToCourierByEmployeeDto,
  CompleteOrderAssemblyByEmployeeDto
} from './shop.orders.request.dtos';
import { OrderPreviewResponseDto, OrderFullResponseDto } from './shop.orders.response.dtos';
import { EmployeeModel } from 'src/modules/employee/employee.schema';
import { checkId, verifyUserStatus } from 'src/common/utils';
import { NotificationService } from 'src/infra/notification/notification.service';
import {AuthenticatedEmployee, AuthenticatedUser} from 'src/common/types';
import { CustomerModel } from 'src/modules/customer/infrastructure/schemas/customer.schema';

@Injectable()
export class ShopOrdersRoleService {
  constructor(
    @InjectModel('Shop') private readonly shopModel: ShopModel,
    @InjectModel('ShopProduct') private readonly shopProductModel,
    @InjectModel('Order') private readonly orderModel: OrderModel,
    @InjectModel('Employee') private readonly employeeModel: EmployeeModel,
    @InjectModel('Customer') private readonly customerModel: CustomerModel,
    private readonly notificationService: NotificationService
  ) {}

  
  // async getOrders(authedShop: AuthenticatedUser): Promise<OrderPreviewResponseDto[]> {
  //   // Проверка существования магазина
  //   const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id isBlocked verifiedStatus').lean().exec();
  //   if (!shop) throw new NotFoundException('Магазин не найден');
    
  //   // Проверка прав доступа
  //   if (!shop._id.equals(new Types.ObjectId(authedShop.id))) throw new UnauthorizedException('Нет прав доступа к этому магазину');
    
  //   // Получение всех заказов магазина
  //   const orders = await this.orderModel
  //     .find({ 'orderedFrom.shop': shop._id })
  //     .sort({ orderedAt: -1 }) // Сортировка по дате заказа (новые сверху)
  //     .lean({virtuals: true})
  //     .exec();
    
  //   // Преобразование данных для ответа клиенту
  //   return plainToInstance(OrderPreviewResponseDto, orders,  { excludeExtraneousValues: true });
  // }

  
  // async getActiveOrders(authedShop: AuthenticatedUser): Promise<OrderPreviewResponseDto[]> {
  //   // Проверка существования магазина
  //   const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id isBlocked verifiedStatus').lean().exec();
  //   if (!shop) throw new NotFoundException('Магазин не найден');
    
  //   // Получение только активных заказов
  //   const activeOrders = await this.orderModel.find({
  //     'orderedFrom.shop': shop._id,
  //     orderStatus: { $in: [
  //       OrderStatus.PENDING,
  //       OrderStatus.PREPARING,
  //       OrderStatus.AWAITING_COURIER,
  //       OrderStatus.DELIVERING
  //     ] } // только активные статусы
  //   })
  //   .sort({ orderedAt: 1 }) // сортировка по времени создания (старые сверху, чтобы обрабатывать в первую очередь)
  //   .lean({virtuals: true})
  //   .exec();
    
  //   // Преобразование данных для ответа клиенту
  //   return plainToInstance(OrderPreviewResponseDto, activeOrders, { excludeExtraneousValues: true });
  // }


  // async getOrder(
  //   authedShop: AuthenticatedUser,
  //   orderId: string,
  // ): Promise<OrderFullResponseDto> {
  //   // Проверка существования магазина
  //   const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id isBlocked verifiedStatus').lean().exec();
  //   if (!shop) throw new NotFoundException('Магазин не найден');
    
  //   // Проверка прав доступа
  //   if (shop._id.toString() !== authedShop.id) throw new UnauthorizedException('Нет прав доступа к этому магазину');
    
  //   // Получение заказа по ID
  //   checkId([orderId]);
  //   const order = await this.orderModel.findOne({
  //     _id: new Types.ObjectId(orderId),
  //     'orderedFrom.shop': new Types.ObjectId(shop._id)
  //   }).lean({virtuals: true}).exec();
    
  //   if (!order) throw new NotFoundException('Заказ не найден');
    
  //   // Преобразование данных для ответа клиенту
  //   return plainToInstance(OrderFullResponseDto, order, { excludeExtraneousValues: true });
  // }


  // async declineOrderByEmployee(
  //   authedShop: AuthenticatedUser,
  //   authedEmployee: AuthenticatedEmployee,
  //   orderId: string,
  //   dto: DeclineOrderByEmployeeDto
  // ): Promise<OrderFullResponseDto> {
  //   // Проверка существования магазина
  //   const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id isBlocked verifiedStatus activeOrders currentShift').exec();
  //   if (!shop) throw new NotFoundException('Магазин не найден');
  //   // verifyUserStatus(shop)

  //   // Проверка прав доступа
  //   if (shop._id.toString() !== authedShop.id) throw new UnauthorizedException('Нет прав доступа к этому магазину');
    
  //   // Проверка привязки сотрудника к магазину
  //   const employee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).select('pinnedTo isBlocked verifiedStatus employeeName').exec();
  //   if (!employee) throw new NotFoundException('Сотрудник не найден');
  //   if (employee.pinnedTo && employee.pinnedTo.toString() !== shop._id.toString()) throw new UnauthorizedException('Сотрудник не привязан к этому магазину');
    
  //   // Находим заказ
  //   checkId([orderId]);
  //   const order = await this.orderModel.findOne({
  //     _id: new Types.ObjectId(orderId),
  //     'orderedFrom.shop': shop._id
  //   }).exec();
    
  //   if (!order) throw new NotFoundException('Заказ не найден');
    
  //   // Проверяем, что заказ можно отклонить (только в статусе PENDING)
  //   const cancelableStatuses = [OrderStatus.PENDING];
  //   if (!cancelableStatuses.includes(order.orderStatus)) throw new BadRequestException(`Невозможно отклонить заказ в статусе ${order.orderStatus}`);
    
  //   // Обновляем заказ - устанавливаем статус и причину отклонения
  //   order.orderStatus = OrderStatus.DECLINED;
  //   order.declinedAt = dto.declineAt ? new Date(dto.declineAt) : new Date();
  //   order.declinedReason = dto.declineReason;
  //   order.declinedComment = dto.comment || null;
    
  //   order.handledBy = {
  //     employee: new Types.ObjectId(employee._id),
  //     employeeName: employee.employeeName ? String(employee.employeeName) : 'Сотрудник',
  //     shift: shop.currentShift ? new Types.ObjectId(shop.currentShift.toString()) : null
  //   };
    
  //   // Сохраняем обновленный заказ
  //   await order.save();

  //   // Удаляем заказ из активных заказов магазина
  //   const customer = await this.customerModel.findById(order.orderedBy.customer).select('_id activeOrders').exec();
  //   if (!customer) throw new NotFoundException('Клиент не найден');
    
  //   customer.activeOrders = customer.activeOrders.filter(id => id.toString() !== order._id.toString());
  //   await customer.save();

  //   // TODO: fix type
  //   // @ts-ignore
  //   shop.activeOrders = shop.activeOrders.filter(id => id.toString() !== order._id.toString());
  //   await shop.save();

  //   // Отправляем уведомление клиенту
  //   await this.notificationService.notifyCustomerAboutOrderUpdate(order._id.toString());
    
  //   // Возвращаем обновленный заказ
  //   return this.getOrder(authedShop, orderId);
  // }


  // async acceptOrderByEmployee(
  //   authedShop: AuthenticatedUser, 
  //   authedEmployee: AuthenticatedEmployee,
  //   orderId: string, 
  // ): Promise<OrderFullResponseDto> {
  //   // Проверка существования магазина
  //   const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id isBlocked verifiedStatus currentShift').lean().exec();
  //   if (!shop) throw new NotFoundException('Магазин не найден');
  //   verifyUserStatus(shop)

  //   // Проверка прав доступа
  //   if (shop._id.toString() !== authedShop.id) throw new UnauthorizedException('Нет прав доступа к этому магазину');
    
  //   // Проверка привязки сотрудника к магазину
  //   const employee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).select('_id pinnedTo isBlocked verifiedStatus employeeName').lean().exec();
  //   if (!employee) throw new NotFoundException('Сотрудник не найден');
  //   if (employee.pinnedTo && employee.pinnedTo.toString() !== shop._id.toString()) throw new UnauthorizedException('Сотрудник не привязан к этому магазину');
    
  //   // Находим заказ
  //   const order = await this.orderModel.findOne({_id: new Types.ObjectId(orderId), 'orderedFrom.shop': shop._id}).exec();
  //   if (!order) throw new NotFoundException('Заказ не найден');
    
  //   // Проверяем, что заказ в статусе ожидания
  //   const acceptableStatuses = [OrderStatus.PENDING];
  //   if (!acceptableStatuses.includes(order.orderStatus)) throw new BadRequestException(`Невозможно принять заказ в статусе ${order.orderStatus}`);
    
  //   // Обновляем заказ
  //   order.orderStatus = OrderStatus.PREPARING;
  //   order.acceptedAt = new Date();
    
  //   // Устанавливаем информацию о сотруднике, принявшем заказ
  //   order.handledBy = {
  //     employee: new Types.ObjectId(employee._id),
  //     employeeName: employee.employeeName ? String(employee.employeeName) : 'Сотрудник',
  //     shift: shop.currentShift ? new Types.ObjectId(shop.currentShift.toString()) : null
  //   };
    
  //   // Сохраняем обновленный заказ
  //   await order.save();

  //   await this.notificationService.notifyCustomerAboutOrderUpdate(order._id.toString());
    
  //   // Возвращаем обновленный заказ
  //   return this.getOrder(authedShop, orderId);
  // }


  // async prepareOrderByEmployee(
  //   authedShop: AuthenticatedUser, 
  //   authedEmployee: AuthenticatedEmployee,
  //   orderId: string, 
  //   dto: PrepareOrderProductByEmployeeDto
  // ): Promise<OrderFullResponseDto> {
  //   // Проверка существования магазина
  //   const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id isBlocked verifiedStatus').lean().exec();
  //   if (!shop) throw new NotFoundException('Магазин не найден');
  //   // verifyUserStatus(shop)
  //   // Проверка прав доступа
    
  //   // Проверка привязки сотрудника к магазину
  //   const employee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).select('_id pinnedTo isBlocked verifiedStatus').lean().exec();
  //   if (!employee) throw new NotFoundException('Сотрудник не найден');
  //   if (employee.pinnedTo && employee.pinnedTo.toString() !== shop._id.toString()) throw new UnauthorizedException('Сотрудник не привязан к этому магазину');
    
  //   // Находим заказ
  //   checkId([orderId]);
  //   const order = await this.orderModel.findOne({_id: new Types.ObjectId(orderId), 'orderedFrom.shop': shop._id}).exec();
  //   if (!order) throw new NotFoundException('Заказ не найден');
    
  //   // Проверяем, что заказ в статусе подготовки
  //   const preparableStatuses = [OrderStatus.PREPARING];
  //   if (!preparableStatuses.includes(order.orderStatus)) throw new BadRequestException(`Невозможно подготовить заказ в статусе ${order.orderStatus}`);
    
  //   // Проверяем, что продукт из DTO соответствует одному из продуктов заказа
  //   const orderProduct = order.products.find(p => p.shopProduct.toString() === dto.shopProductId);
  //   if (!orderProduct) throw new BadRequestException(`Продукт с ID ${dto.shopProductId} не найден в заказе`);
    
  //   // Общая сумма бонусов, которую нужно вернуть клиенту за недобор весовых продуктов
  //   let totalBonusAmount = 0;
    
  //   // Фактически набранное количество
  //   const actualQuantity = dto.preparedQuantity;
  //   // Заказанное количество
  //   const selectedQuantity = orderProduct.selectedQuantity || 0;
  //   // Единица измерения продукта
  //   const measuringScale = orderProduct.measuringScale;
    
  //   // Проверяем, является ли товар весовым
  //   const isWeightProduct = measuringScale === ProductMeasuringScale.KG;
    
  //   // Для штучных товаров необходимо точное совпадение количества
  //   if (!isWeightProduct && actualQuantity !== selectedQuantity) {
  //     throw new BadRequestException(
  //       `Для штучных товаров необходимо точное совпадение количества. ` +
  //       `Заказано: ${selectedQuantity}, подготовлено: ${actualQuantity}`
  //     );
  //   }
    
  //   // Только для весовых товаров применяем правила недобора
  //   if (isWeightProduct) {
  //     // Проверяем, что набранное количество не меньше минимально допустимого (по умолчанию 90%)
  //     if (actualQuantity < selectedQuantity * DEFAULT_MIN_WEIGHT_PERCENTAGE) {
  //       throw new BadRequestException(
  //         `Набранное количество продукта (${actualQuantity} кг) меньше минимально допустимого ` +
  //         `(${(selectedQuantity * DEFAULT_MIN_WEIGHT_PERCENTAGE).toFixed(3)} кг). ` +
  //         `Минимальное допустимое количество - ${(DEFAULT_MIN_WEIGHT_PERCENTAGE * 100)}% от заказанного.`
  //       );
  //     }
      
  //     // Если набранное количество меньше заказанного, рассчитываем бонусы
  //     if (actualQuantity < selectedQuantity) {
  //       const priceDifference = Math.ceil((selectedQuantity - actualQuantity) * orderProduct.price);
  //       // Сохраняем бонусы для конкретного продукта
  //       orderProduct.weightCompensationBonus = priceDifference;
  //       // Добавляем к общей сумме бонусов
  //       totalBonusAmount += priceDifference;
  //     } else {
  //       // Если разницы нет, устанавливаем бонус в 0
  //       orderProduct.weightCompensationBonus = 0;
  //     }
  //   }
    
  //   // Обновляем актуальное количество в заказе
  //   orderProduct.actualQuantity = actualQuantity;
    
  //   // Если есть бонусы за недобор весовых продуктов, сохраняем их в поле finances.totalWeightCompensationBonus
  //   if (totalBonusAmount > 0) {
  //     // Сохраняем бонусы в поле finances.totalWeightCompensationBonus
  //     if (!order.finances.totalWeightCompensationBonus) order.finances.totalWeightCompensationBonus = totalBonusAmount;
  //     else order.finances.totalWeightCompensationBonus += totalBonusAmount;
  //   }
    
  //   // Сохраняем обновленный заказ
  //   await order.save();
    
  //   // Возвращаем обновленный продукт
  //   return this.getOrder(authedShop, orderId);
  // };

  // async completeOrderAssemblyByEmployee(
  //   authedShop: AuthenticatedUser, 
  //   authedEmployee: AuthenticatedEmployee,
  //   orderId: string, 
  //   dto: CompleteOrderAssemblyByEmployeeDto
  // ): Promise<OrderFullResponseDto> {
  //   // Проверка существования магазина
  //   const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id isBlocked verifiedStatus').lean().exec();
  //   if (!shop) throw new NotFoundException('Магазин не найден');
  //   verifyUserStatus(shop);

  //   // Проверка привязки сотрудника к магазину
  //   const employee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).select('pinnedTo isBlocked verifiedStatus').lean().exec();
  //   if (!employee) throw new NotFoundException('Сотрудник не найден');
  //   if (employee.pinnedTo && employee.pinnedTo.toString() !== shop._id.toString()) throw new UnauthorizedException('Сотрудник не привязан к этому магазину');
    
  //   // Находим заказ
  //   checkId([orderId]);
  //   const order = await this.orderModel.findOne({_id: new Types.ObjectId(orderId), 'orderedFrom.shop': shop._id}).exec();
  //   if (!order) throw new NotFoundException('Заказ не найден');
    
  //   // Проверяем, что заказ в статусе подготовки
  //   if (order.orderStatus !== OrderStatus.PREPARING) throw new BadRequestException(`Невозможно завершить сборку заказа в статусе ${order.orderStatus}. Заказ должен быть в статусе PREPARING.`);
    
  //   // Проверяем, что все продукты имеют фактическое количество (actualQuantity)
  //   const unpreparedProducts = order.products.filter(product => product.actualQuantity === null);
  //   if (unpreparedProducts.length > 0) throw new BadRequestException('Не все продукты в заказе подготовлены. Пожалуйста, завершите подготовку всех продуктов.');
    
  //   // Проверяем, что все продукты из DTO существуют в заказе
  //   const orderProductIds = order.products.map(p => p.shopProduct.toString());

  //   // TODO: fix type
  //   // @ts-ignore
  //   const assembledProductIds = dto.assembledOrderProducts.map(p => p.shopProduct?.toString());
    
  //   // Проверяем, что все продукты из DTO существуют в заказе
  //   const invalidProducts = assembledProductIds.filter(id => !orderProductIds.includes(id));
  //   if (invalidProducts.length > 0) throw new BadRequestException(`Следующие продукты не найдены в заказе: ${invalidProducts.join(', ')}`);
    
  //   // Уменьшаем количество продуктов в остатках
  //   const bulkOps = order.products.map(orderProduct => ({
  //     updateOne: {
  //       filter: { _id: orderProduct.shopProduct.toString() },
  //       update: { $inc: { stockQuantity: -orderProduct.actualQuantity! } }
  //     }
  //   }));
    
  //   if (bulkOps.length > 0) await this.shopProductModel.bulkWrite(bulkOps);
    
  //   // Обновляем статус заказа и фиксируем время сборки
  //   order.orderStatus = OrderStatus.AWAITING_COURIER;
  //   order.assembledAt = dto.assemblyCompletedAt ? new Date(dto.assemblyCompletedAt) : new Date();
    
  //   // Сохраняем обновленный заказ
  //   await order.save();
    
  //   // Отправляем уведомление клиенту
  //   // await this.notificationService.notifyCustomerAboutOrderUpdate(order._id.toString());
    
  //   // Возвращаем обновленный заказ
  //   return this.getOrder(authedShop, orderId);
  // }

  // async handOrderToCourierByEmployee(
  //   authedShop: AuthenticatedUser, 
  //   authedEmployee: AuthenticatedEmployee,
  //   orderId: string, 
  //   dto: HandOrderToCourierByEmployeeDto
  // ): Promise<OrderFullResponseDto> {
  //   // Проверка существования магазина
  //   const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id isBlocked verifiedStatus').lean().exec();
  //   if (!shop) throw new NotFoundException('Магазин не найден');
  //   // verifyUserStatus(shop);
    
  //   // Проверка привязки сотрудника к магазину
  //   const employee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).select('pinnedTo isBlocked verifiedStatus').lean().exec();
  //   if (!employee) throw new NotFoundException('Сотрудник не найден');
  //   if (employee.pinnedTo && employee.pinnedTo.toString() !== shop._id.toString()) throw new UnauthorizedException('Сотрудник не привязан к этому магазину');
    
  //   // Находим заказ
  //   checkId([orderId]);
  //   const order = await this.orderModel.findOne({_id: new Types.ObjectId(orderId), 'orderedFrom.shop': shop._id}).exec();
  //   if (!order) throw new NotFoundException('Заказ не найден');
    
  //   // Проверяем, что заказ в статусе ожидания курьера
  //   if (order.orderStatus !== OrderStatus.AWAITING_COURIER) throw new BadRequestException(`Невозможно передать заказ курьеру в статусе ${order.orderStatus}. Заказ должен быть в статусе AWAITING_COURIER.`);
    
  //   // Проверяем, что заказ был собран
  //   if (!order.assembledAt) throw new BadRequestException('Заказ не был собран. Сначала необходимо завершить сборку заказа.');
    
  //   // Обновляем статус заказа и фиксируем время передачи курьеру
  //   order.orderStatus = OrderStatus.DELIVERING;
  //   order.handedToCourierAt = dto.handedToCourierAt ? new Date(dto.handedToCourierAt) : new Date();
    
  //   // Сохраняем обновленный заказ
  //   await order.save();
    
  //   // Отправляем уведомление клиенту о передаче заказа курьеру
  //   await this.notificationService.notifyCustomerAboutOrderUpdate(order._id.toString());
    
  //   // Возвращаем обновленный заказ
  //   return this.getOrder(authedShop, orderId);
  // }
};
