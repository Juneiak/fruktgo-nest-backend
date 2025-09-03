import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from 'src/modules/order/order.schema';
import { OrderStatus } from "src/modules/order/order.schema";
import { MessageResponseDto } from 'src/common/dtos';
import {AuthenticatedUser} from 'src/common/types';
import { Customer } from 'src/modules/customer/schemas/customer.schema';

@Injectable()
export class OrderDeliveryService {
  constructor(
    @InjectModel('Order') private readonly orderModel: Model<Order>,
    @InjectModel('Customer') private readonly customerModel: Model<Customer>,
  ) {}

  async completeOrder(
    orderId: string,
    authedDelivery: AuthenticatedUser
  ): Promise<MessageResponseDto> {
    // Находим заказ по ID
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Заказ не найден');
    
    // Проверяем, что заказ находится в статусе доставки
    if (order.orderStatus !== OrderStatus.DELIVERING) {
      throw new BadRequestException(
        `Невозможно завершить заказ в статусе ${order.orderStatus}. ` +
        `Заказ должен быть в статусе ${OrderStatus.DELIVERING}`
      );
    }
    
    // Обновляем статус заказа
    order.orderStatus = OrderStatus.DELIVERED;
    order.deliveredAt = new Date();
    
    // Сохраняем информацию о курьере, который доставил заказ
    // TODO: При необходимости сохранять дополнительную информацию о курьере
    // order.deliveredBy = {
    //   courierId: authedDelivery.id,
    //   courierName: authedDelivery.name || 'Курьер'
    // };
    
    try {
      await order.save();
      
      const customer = await this.customerModel.findById(order.orderedBy.customer).select('_id activeOrders').exec();
      if (!customer) throw new NotFoundException('Клиент не найден');
      
      customer.activeOrders = customer.activeOrders.filter(id => id.toString() !== order._id.toString());
      await customer.save();
      
      // Обновляем финансовую информацию, если необходимо
      // TODO: Интеграция с финансовым модулем для учета завершенных заказов
      // await this.financialService.processDeliveredOrder(order);
      
      // Отправляем уведомление клиенту о доставке заказа
      // TODO: Интеграция с сервисом уведомлений
      // await this.notificationsService.sendOrderDeliveredNotification(order);
      
      return {message: `Заказ №${order.orderId} успешно доставлен`};
    } catch (error) {
      throw new InternalServerErrorException(`Ошибка при завершении заказа: ${error.message}`);
    }
  }

}