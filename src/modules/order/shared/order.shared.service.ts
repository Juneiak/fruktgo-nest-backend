import { Injectable } from '@nestjs/common';
import { OrderModel, OrderStatus } from '../order.schema';
import { Order } from '../order.schema';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CustomerModel } from 'src/modules/customer/schemas/customer.schema';
import { transformOrderToPreview } from '../roles/customer/utils';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class OrderSharedService {
  constructor(
    @InjectModel('Customer') private customerModel: CustomerModel,
    @InjectModel('Order') private orderModel: OrderModel, 
  ) {}

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
}