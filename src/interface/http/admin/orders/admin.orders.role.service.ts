import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from 'src/modules/order/order.schema';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import {
  OrderPreviewResponseDto,
  OrderFullResponseDto
} from './admin.orders.response.dtos';
import { plainToInstance } from 'class-transformer';
import { checkId } from 'src/common/utils';
import {AuthenticatedUser} from 'src/common/types';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dtos';
import { LogsService } from 'src/infra/logs/application/log.service';
import { OrderQueryDto } from './admin.orders.query.dtos';


@Injectable()
export class AdminOrdersRoleService {
  constructor(
    @InjectModel('Order') private readonly orderModel: Model<Order>,
    private readonly logsService: LogsService
  ) {}

  async getOrders(
    authedAdmin: AuthenticatedUser, 
    paginationQuery: PaginationQueryDto,
    orderQuery?: OrderQueryDto
  ): Promise<PaginatedResponseDto<OrderPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Создаем фильтр для поиска
    const queryFilter = this.buildOrderFilter(orderQuery);
    
    // Получаем общее количество заказов для пагинации с учетом фильтра
    const totalItems = await this.orderModel.countDocuments(queryFilter).exec();
    
    // Получаем заказы с пагинацией и фильтрацией
    const orders = await this.orderModel.find(queryFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    // Формируем метаданные пагинации
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(OrderPreviewResponseDto, orders, {excludeExtraneousValues: true, exposeDefaultValues: true});
    return { items, pagination };
  }
  

  /**
   * Создает объект фильтрации для запроса в базу данных на основе переданных параметров
   */
  private buildOrderFilter(filter: OrderQueryDto = {}): any {
    const queryFilter: any = {};
    
    // Фильтрация по клиенту
    if (filter?.customerId) queryFilter['orderedBy.customer'] = new Types.ObjectId(filter.customerId);
    
    // Фильтрация по магазину
    if (filter?.shopId) queryFilter['orderedFrom.shop'] = new Types.ObjectId(filter.shopId);
    
    // Фильтрация по сотруднику
    if (filter?.employeeId) queryFilter['handledBy.employee'] = new Types.ObjectId(filter.employeeId);
    
    // Фильтрация по смене
    if (filter?.shiftId) queryFilter['shift'] = new Types.ObjectId(filter.shiftId);

    // Фильтрация по статусу заказа
    if (filter?.status) queryFilter['orderStatus'] = filter.status;
    
    // Фильтрация по периоду дат
    if (filter?.startDate || filter?.endDate) {
      queryFilter['orderedAt'] = {};
      
      if (filter?.startDate) queryFilter['orderedAt']['$gte'] = new Date(filter.startDate);
      if (filter?.endDate) queryFilter['orderedAt']['$lte'] = new Date(filter.endDate);
    }
    
    return queryFilter;
  }


  async getOrder(authedAdmin: AuthenticatedUser, orderId: string): Promise<OrderFullResponseDto> {
    checkId([orderId]);
    const order = await this.orderModel.findById(orderId).lean({ virtuals: true }).exec();
    if (!order) throw new NotFoundException(`Заказ с ID ${orderId} не найден`);
    return plainToInstance(OrderFullResponseDto, order, {excludeExtraneousValues: true,exposeDefaultValues: true});
  }


  async getOrderLogs(authedAdmin: AuthenticatedUser, orderId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([orderId]);
    return this.logsService.getAllOrderLogs(orderId, paginationQuery);
  }


  async getAllCustomersOrders(authedAdmin: AuthenticatedUser, customerId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedResponseDto<OrderPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество заказов для пагинации
    const totalItems = await this.orderModel.countDocuments({ 'orderedBy.customer': new Types.ObjectId(customerId) }).exec();
    
    // Получаем заказы с пагинацией
    const orders = await this.orderModel.find({ 'orderedBy.customer': new Types.ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    // Формируем метаданные пагинации
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(OrderPreviewResponseDto, orders, {excludeExtraneousValues: true, exposeDefaultValues: true});
    return { items, pagination };
  }
};
