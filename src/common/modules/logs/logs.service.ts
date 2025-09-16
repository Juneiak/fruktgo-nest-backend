import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { MessageResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { 
  BaseLog,
  LogLevel,
  LogEntityType,
  LogModel,
 } from './logs.schema';
import { LogDto, PaginatedLogDto } from './logs.response.dto';
import { transformPaginatedResult } from 'src/common/utils';
import { plainToInstance } from 'class-transformer';
import { UserType } from "src/common/enums/common.enum";

type CreateLogSettings = {
  logLevel?: LogLevel;
  forRoles?: UserType[];
  session?: ClientSession;
}

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
    settings: CreateLogSettings = {
      logLevel: LogLevel.LOW,
      forRoles: [],
      session: undefined
    }
  ): Promise<BaseLog> {
    const logData = {
      entityType,
      entityId: new Types.ObjectId(entityId),
      text,
      logLevel: settings.logLevel,
      forRoles: [UserType.ADMIN, ...(settings.forRoles || [])],
    }
    if (settings.session) {
      return await this.logModel.create([logData], { session: settings.session }).then(docs => docs[0]);
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
    paginationQuery: PaginationQueryDto,
    forRoles?: UserType[]
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    
    // Строим фильтр
    const filter: any = { 
      entityType, 
      entityId: new Types.ObjectId(entityId) 
    };
    
    // Добавляем фильтр по ролям только если роли переданы
    if (forRoles && forRoles.length > 0) filter.forRoles = { $in: forRoles }; // Пересечение массивов
    
    const result = await this.logModel.paginate(
      filter,
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
  async addCustomerLog(customerId: string, text: string, settings: CreateLogSettings = {
    logLevel: LogLevel.LOW,
    forRoles: [],
    session: undefined
  }) {
    return this.createLog(LogEntityType.CUSTOMER, customerId, text, settings);
  }
  
  async getAllCustomerLogs(customerId: string, paginationQuery: PaginationQueryDto, forRoles?: UserType[]) {
    return this.getEntityLogs(LogEntityType.CUSTOMER, customerId, paginationQuery, forRoles);
  }
  
  async deleteCustomerLog(customerId: string, logId: string, session?: ClientSession, ) {
    return this.deleteLog(LogEntityType.CUSTOMER, customerId, logId, session);
  }
  
  async deleteAllCustomerLogs(customerId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.CUSTOMER, customerId, session);
  }

  // Employee logs
  async addEmployeeLog(employeeId: string, text: string, settings: CreateLogSettings = {
    logLevel: LogLevel.LOW,
    forRoles: [],
    session: undefined
  }) {
    return this.createLog(LogEntityType.EMPLOYEE, employeeId, text, settings);
  }
  
  async getAllEmployeeLogs(employeeId: string, paginationQuery: PaginationQueryDto, forRoles?: UserType[]) {
    return this.getEntityLogs(LogEntityType.EMPLOYEE, employeeId, paginationQuery, forRoles);
  }
  
  async deleteEmployeeLog(employeeId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.EMPLOYEE, employeeId, logId, session);
  }
  
  async deleteAllEmployeeLogs(employeeId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.EMPLOYEE, employeeId, session);
  }



  // Order logs
  async addOrderLog(orderId: string, text: string, settings: CreateLogSettings = {
    logLevel: LogLevel.LOW,
    forRoles: [],
    session: undefined
  }) {
    return this.createLog(LogEntityType.ORDER, orderId, text, settings);
  }
  
  async getAllOrderLogs(orderId: string, paginationQuery: PaginationQueryDto, forRoles?: UserType[]) {
    return this.getEntityLogs(LogEntityType.ORDER, orderId, paginationQuery, forRoles);
  }
  
  async deleteOrderLog(orderId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.ORDER, orderId, logId, session);
  }
  
  async deleteAllOrderLogs(orderId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.ORDER, orderId, session);
  }



  // Product logs
  async addProductLog(productId: string, text: string, settings: CreateLogSettings = {
    logLevel: LogLevel.LOW,
    forRoles: [],
    session: undefined
  }) {
    return this.createLog(LogEntityType.PRODUCT, productId, text, settings);
  }
  
  async getAllProductLogs(productId: string, paginationQuery: PaginationQueryDto, forRoles?: UserType[]) {
    return this.getEntityLogs(LogEntityType.PRODUCT, productId, paginationQuery, forRoles);
  }
  
  async deleteProductLog(productId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.PRODUCT, productId, logId, session);
  }
  
  async deleteAllProductLogs(productId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.PRODUCT, productId, session);
  }



  // Seller logs
  async addSellerLog(sellerId: string, text: string, settings: CreateLogSettings = {
    logLevel: LogLevel.LOW,
    forRoles: [],
    session: undefined
  }) {
    return this.createLog(LogEntityType.SELLER, sellerId, text, settings);
  }
  
  async getAllSellerLogs(sellerId: string, paginationQuery: PaginationQueryDto, forRoles?: UserType[]) {
    return this.getEntityLogs(LogEntityType.SELLER, sellerId, paginationQuery, forRoles);
  }
  
  async deleteSellerLog(sellerId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SELLER, sellerId, logId, session);
  }
  
  async deleteAllSellerLogs(sellerId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SELLER, sellerId, session);
  }



  // ShopProduct logs
  async addShopProductLog(shopProductId: string, text: string, settings: CreateLogSettings = {
    logLevel: LogLevel.LOW,
    forRoles: [],
    session: undefined
  }) {
    return this.createLog(LogEntityType.SHOP_PRODUCT, shopProductId, text, settings);
  }
  
  async getAllShopProductLogs(shopProductId: string, paginationQuery: PaginationQueryDto, forRoles?: UserType[]) {
    return this.getEntityLogs(LogEntityType.SHOP_PRODUCT, shopProductId, paginationQuery, forRoles);
  }
  
  async deleteShopProductLog(shopProductId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SHOP_PRODUCT, shopProductId, logId, session);
  }
  
  async deleteAllShopProductLogs(shopProductId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SHOP_PRODUCT, shopProductId, session);
  }



  // Shift logs
  async addShiftLog(shiftId: string, text: string, settings: CreateLogSettings = {
    logLevel: LogLevel.LOW,
    forRoles: [],
    session: undefined
  }) {
    return this.createLog(LogEntityType.SHIFT, shiftId, text, settings);
  }
  
  async getAllShiftLogs(shiftId: string, paginationQuery: PaginationQueryDto, forRoles?: UserType[]) {
    return this.getEntityLogs(LogEntityType.SHIFT, shiftId, paginationQuery, forRoles);
  }
  
  async deleteShiftLog(shiftId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SHIFT, shiftId, logId, session);
  }
  
  async deleteAllShiftLogs(shiftId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SHIFT, shiftId, session);
  }



  // Shop logs
  async addShopLog(shopId: string, text: string, settings: CreateLogSettings = {
    logLevel: LogLevel.LOW,
    forRoles: [],
    session: undefined
  }) {
    return this.createLog(LogEntityType.SHOP, shopId, text, settings);
  }
  
  async getAllShopLogs(shopId: string, paginationQuery: PaginationQueryDto, forRoles?: UserType[]) {
    return this.getEntityLogs(LogEntityType.SHOP, shopId, paginationQuery, forRoles);
  }
  
  async deleteShopLog(shopId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SHOP, shopId, logId, session);
  }
  
  async deleteAllShopLogs(shopId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SHOP, shopId, session);
  }

  // ShopAccount logs
  async addShopAccountLog(shopAccountId: string, text: string, settings: CreateLogSettings = {
    logLevel: LogLevel.LOW,
    forRoles: [],
    session: undefined
  }) {
    return this.createLog(LogEntityType.SHOP_ACCOUNT, shopAccountId, text, settings);
  }
  
  async getAllShopAccountLogs(shopAccountId: string, paginationQuery: PaginationQueryDto, forRoles?: UserType[]) {
    return this.getEntityLogs(LogEntityType.SHOP_ACCOUNT, shopAccountId, paginationQuery, forRoles);
  }
  
  async deleteShopAccountLog(shopAccountId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SHOP_ACCOUNT, shopAccountId, logId, session);
  }
  
  async deleteAllShopAccountLogs(shopAccountId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SHOP_ACCOUNT, shopAccountId, session);
  }

  // SellerAccount logs
  async addSellerAccountLog(sellerAccountId: string, text: string, settings: CreateLogSettings = {
    logLevel: LogLevel.LOW,
    forRoles: [],
    session: undefined
  }) {
    return this.createLog(LogEntityType.SELLER_ACCOUNT, sellerAccountId, text, settings);
  }
  
  async getAllSellerAccountLogs(sellerAccountId: string, paginationQuery: PaginationQueryDto, forRoles?: UserType[]) {
    return this.getEntityLogs(LogEntityType.SELLER_ACCOUNT, sellerAccountId, paginationQuery, forRoles);
  }
  
  async deleteSellerAccountLog(sellerAccountId: string, logId: string, session?: ClientSession) {
    return this.deleteLog(LogEntityType.SELLER_ACCOUNT, sellerAccountId, logId, session);
  }
  
  async deleteAllSellerAccountLogs(sellerAccountId: string, session?: ClientSession) {
    return this.deleteAllEntityLogs(LogEntityType.SELLER_ACCOUNT, sellerAccountId, session);
  }
}