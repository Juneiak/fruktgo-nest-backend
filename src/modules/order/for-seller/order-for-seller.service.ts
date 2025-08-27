
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { AuthenticatedUser } from 'src/common/types';
import { OrderPreviewResponseForSellerDto, OrderFullResponseForSellerDto } from './order-for-seller.dtos';
import { Order } from 'src/modules/order/order.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Shop } from 'src/modules/shop/schemas/shop.schema';
import { PaginationQueryDto, PaginationMetaDto, PaginatedResponseDto } from "src/common/dtos";

@Injectable()
export class OrderForSellerService {
  @InjectModel('Order') private readonly orderModel: Model<Order>;
  @InjectModel('Shop') private readonly shopModel: Model<Shop>;
  
  constructor() {}

  // ====================================================
  // ORDERS 
  // ====================================================

  async getOrders(
    authedSeller: AuthenticatedUser, 
    shopId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<OrderPreviewResponseForSellerDto>> {
    const shop = await this.shopModel.find({owner: new Types.ObjectId(authedSeller.id), _id: new Types.ObjectId(shopId)})
    .select('_id isBlocked verifiedStatus owner')
    .lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    
    // Получаем параметры пагинации с значениями по умолчанию
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество заказов для пагинации
    const totalItems = await this.orderModel.countDocuments({ 'orderedFrom.shop': new Types.ObjectId(shopId) }).exec();
    
    // Получаем заказы с пагинацией
    const orders = await this.orderModel.find({ 'orderedFrom.shop': new Types.ObjectId(shopId) })
      .sort({ orderedAt: -1 }) // Сортировка по дате создания (от новых к старым)
      .skip(skip)
      .limit(pageSize)
      .lean({virtuals: true})
      .exec();
    
    // Формируем метаданные пагинации
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    // Преобразуем данные в DTO
    const items = plainToInstance(OrderPreviewResponseForSellerDto, orders, { excludeExtraneousValues: true });
    return { items, pagination };
  }

  async getOrder(authedSeller: AuthenticatedUser, shopId: string, orderId: string): Promise<OrderFullResponseForSellerDto> {
    const shop = await this.shopModel.findOne({owner: new Types.ObjectId(authedSeller.id), _id: new Types.ObjectId(shopId)}).select('_id isBlocked verifiedStatus').lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    
    const order = await this.orderModel.findOne({_id: new Types.ObjectId(orderId), 'orderedFrom.shop': shop._id}).lean({virtuals: true}).exec();
    if (!order) throw new NotFoundException('Заказ не найден');
    
    // Преобразование данных для ответа клиенту
    return plainToInstance(OrderFullResponseForSellerDto, order, { excludeExtraneousValues: true });
  }
}