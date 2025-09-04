import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { MessageResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { 
  BaseLog,
  LogLevel,
  LogEntityType,
  LogModel,
 } from './logs.schemas';
import { LogDto, PaginatedLogDto } from './logs.dtos';
import { transformPaginatedResult } from 'src/common/utils';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class LogsService {
  constructor(
    @InjectModel('BaseLog') private logModel: LogModel,
  ) {}

  // ====================================================
  // УНИВЕРСАЛЬНЫЕ МЕТОДЫ ДЛЯ ВСЕХ ТИПОВ ЛОГОВ
  // ====================================================
  
  /**
   * Создание лога
   */
  async createLog(
    entityType: LogEntityType,
    entityId: string,
    text: string,
    logLevel: LogLevel = LogLevel.LOW,
    session?: ClientSession
  ): Promise<BaseLog> {
    
    const logData = {
      entityType,
      entityId: new Types.ObjectId(entityId),
      text,
      logLevel,
    }
    
    if (session) {
      return await this.logModel.create([logData], { session }).then(docs => docs[0]);
    } else {
      return await this.logModel.create(logData);
    }
  }



  /**
   * Получение всех логов для сущности с пагинацией
   */
  async getEntityLogs(
    entityType: LogEntityType,
    entityId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    
    const result = await this.logModel.paginate(
      { entityType, entityId: new Types.ObjectId(entityId)},
      { page, limit: pageSize, sort: { createdAt: -1 } }
    );
    
    return transformPaginatedResult(result, LogDto) as PaginatedLogDto;
  }

  /**
   * Получение конкретного лога
   */
  async getLog(logId: string): Promise<LogDto | null> {
    const log = await this.logModel.findById(logId).lean({ virtuals: true }).exec();
    if (!log) return null;
    
    return plainToInstance(LogDto, log, { excludeExtraneousValues: true });
  }

  /**
   * Удаление конкретного лога
   */
  async deleteLog(
    entityType: LogEntityType,
    entityId: string,
    logId: string,
    session?: ClientSession
  ): Promise<MessageResponseDto> {
    await this.logModel.deleteOne({
      _id: new Types.ObjectId(logId),
      entityType,
      entityId: new Types.ObjectId(entityId)
    }, { session }).exec();
    
    return { message: 'Log deleted' };
  }

  /**
   * Удаление всех логов сущности
   */
  async deleteAllEntityLogs(
    entityType: LogEntityType,
    entityId: string,
    session?: ClientSession
  ): Promise<MessageResponseDto> {
    await this.logModel.deleteMany({
      entityType,
      entityId: new Types.ObjectId(entityId)
    }, { session }).exec();
    
    return { message: 'All logs deleted' };
  }



  // ====================================================
  // СПЕЦИАЛИЗИРОВАННЫЕ МЕТОДЫ ДЛЯ УДОБСТВА (WRAPPER'Ы)
  // ====================================================
  
  // Customer logs
  async addCustomerLog(customerId: string, level: LogLevel, text: string, session?: ClientSession) {
    return this.createLog(LogEntityType.CUSTOMER, customerId, text, level, session);
  }
  
  async getAllCustomerLogs(customerId: string, paginationQuery: PaginationQueryDto) {
    return this.getEntityLogs(LogEntityType.CUSTOMER, customerId, paginationQuery);
  }
  
  async deleteCustomerLog(customerId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.CUSTOMER, customerId, logId, session);
  }
  
  async deleteAllCustomerLogs(customerId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.CUSTOMER, customerId, session);
  }

  // Employee logs
  async addEmployeeLog(employeeId: string, level: LogLevel, text: string, session?: ClientSession) {
    return this.createLog(LogEntityType.EMPLOYEE, employeeId, text, level, session);
  }
  
  async getAllEmployeeLogs(employeeId: string, paginationQuery: PaginationQueryDto) {
    return this.getEntityLogs(LogEntityType.EMPLOYEE, employeeId, paginationQuery);
  }
  
  async deleteEmployeeLog(employeeId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.EMPLOYEE, employeeId, logId, session);
  }
  
  async deleteAllEmployeeLogs(employeeId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.EMPLOYEE, employeeId, session);
  }



  // Order logs
  async addOrderLog(orderId: string, level: LogLevel, text: string, session?: ClientSession) {
    return this.createLog(LogEntityType.ORDER, orderId, text, level, session);
  }
  
  async getAllOrderLogs(orderId: string, paginationQuery: PaginationQueryDto) {
    return this.getEntityLogs(LogEntityType.ORDER, orderId, paginationQuery);
  }
  
  async deleteOrderLog(orderId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.ORDER, orderId, logId, session);
  }
  
  async deleteAllOrderLogs(orderId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.ORDER, orderId, session);
  }



  // Product logs
  async addProductLog(productId: string, level: LogLevel, text: string, session?: ClientSession) {
    return this.createLog(LogEntityType.PRODUCT, productId, text, level, session);
  }
  
  async getAllProductLogs(productId: string, paginationQuery: PaginationQueryDto) {
    return this.getEntityLogs(LogEntityType.PRODUCT, productId, paginationQuery);
  }
  
  async deleteProductLog(productId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.PRODUCT, productId, logId, session);
  }
  
  async deleteAllProductLogs(productId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.PRODUCT, productId, session);
  }



  // Seller logs
  async addSellerLog(sellerId: string, level: LogLevel, text: string, session?: ClientSession) {
    return this.createLog(LogEntityType.SELLER, sellerId, text, level, session);
  }
  
  async getAllSellerLogs(sellerId: string, paginationQuery: PaginationQueryDto) {
    return this.getEntityLogs(LogEntityType.SELLER, sellerId, paginationQuery);
  }
  
  async deleteSellerLog(sellerId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SELLER, sellerId, logId, session);
  }
  
  async deleteAllSellerLogs(sellerId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SELLER, sellerId, session);
  }



  // ShopProduct logs
  async addShopProductLog(shopProductId: string, level: LogLevel, text: string, session?: ClientSession) {
    return this.createLog(LogEntityType.SHOP_PRODUCT, shopProductId, text, level, session);
  }
  
  async getAllShopProductLogs(shopProductId: string, paginationQuery: PaginationQueryDto) {
    return this.getEntityLogs(LogEntityType.SHOP_PRODUCT, shopProductId, paginationQuery);
  }
  
  async deleteShopProductLog(shopProductId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SHOP_PRODUCT, shopProductId, logId, session);
  }
  
  async deleteAllShopProductLogs(shopProductId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SHOP_PRODUCT, shopProductId, session);
  }



  // Shift logs
  async addShiftLog(shiftId: string, level: LogLevel, text: string, session?: ClientSession) {
    return this.createLog(LogEntityType.SHIFT, shiftId, text, level, session);
  }
  
  async getAllShiftLogs(shiftId: string, paginationQuery: PaginationQueryDto) {
    return this.getEntityLogs(LogEntityType.SHIFT, shiftId, paginationQuery);
  }
  
  async deleteShiftLog(shiftId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SHIFT, shiftId, logId, session);
  }
  
  async deleteAllShiftLogs(shiftId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SHIFT, shiftId, session);
  }



  // Shop logs
  async addShopLog(shopId: string, level: LogLevel, text: string, session?: ClientSession) {
    return this.createLog(LogEntityType.SHOP, shopId, text, level, session);
  }
  
  async getAllShopLogs(shopId: string, paginationQuery: PaginationQueryDto) {
    return this.getEntityLogs(LogEntityType.SHOP, shopId, paginationQuery);
  }
  
  async deleteShopLog(shopId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SHOP, shopId, logId, session);
  }
  
  async deleteAllShopLogs(shopId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SHOP, shopId, session);
  }

  // ShopAccount logs
  async addShopAccountLog(shopAccountId: string, level: LogLevel, text: string, session?: ClientSession) {
    return this.createLog(LogEntityType.SHOP_ACCOUNT, shopAccountId, text, level, session);
  }
  
  async getAllShopAccountLogs(shopAccountId: string, paginationQuery: PaginationQueryDto) {
    return this.getEntityLogs(LogEntityType.SHOP_ACCOUNT, shopAccountId, paginationQuery);
  }
  
  async deleteShopAccountLog(shopAccountId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SHOP_ACCOUNT, shopAccountId, logId, session);
  }
  
  async deleteAllShopAccountLogs(shopAccountId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SHOP_ACCOUNT, shopAccountId, session);
  }

  // SellerAccount logs
  async addSellerAccountLog(sellerAccountId: string, level: LogLevel, text: string, session?: ClientSession) {
    return this.createLog(LogEntityType.SELLER_ACCOUNT, sellerAccountId, text, level, session);
  }
  
  async getAllSellerAccountLogs(sellerAccountId: string, paginationQuery: PaginationQueryDto) {
    return this.getEntityLogs(LogEntityType.SELLER_ACCOUNT, sellerAccountId, paginationQuery);
  }
  
  async deleteSellerAccountLog(sellerAccountId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SELLER_ACCOUNT, sellerAccountId, logId, session);
  }
  
  async deleteAllSellerAccountLogs(sellerAccountId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SELLER_ACCOUNT, sellerAccountId, session);
  }
}