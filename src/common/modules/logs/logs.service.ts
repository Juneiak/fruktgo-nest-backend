import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { MessageResponseDto, PaginationQueryDto, PaginationMetaDto, PaginatedResponseDto } from 'src/common/dtos';
import { 
  CustomerLog,
  EmployeeLog,
  OrderLog,
  ProductLog,
  SellerLog,
  ShopProductLog,
  ShiftLog,
  ShopLog,
  LogLevel,
  ShopAccountLog,
  SellerAccountLog
 } from './logs.schemas';
import { plainToInstance } from 'class-transformer';
import { LogDto, PaginatedLogDto } from './logs.dtos';

@Injectable()
export class LogsService {
  constructor(
    @InjectModel('CustomerLog') private customerLogModel: Model<CustomerLog>,
    @InjectModel('EmployeeLog') private employeeLogModel: Model<EmployeeLog>,
    @InjectModel('OrderLog') private orderLogModel: Model<OrderLog>,
    @InjectModel('ProductLog') private productLogModel: Model<ProductLog>,
    @InjectModel('SellerLog') private sellerLogModel: Model<SellerLog>,
    @InjectModel('ShopProductLog') private shopProductLogModel: Model<ShopProductLog>,
    @InjectModel('ShiftLog') private shiftLogModel: Model<ShiftLog>,
    @InjectModel('ShopLog') private shopLogModel: Model<ShopLog>,
    @InjectModel('ShopAccountLog') private shopAccountLogModel: Model<ShopAccountLog>,
    @InjectModel('SellerAccountLog') private sellerAccountLogModel: Model<SellerAccountLog>,

  ) {}

  // ====================================================
  // CUSTOMER LOG 
  // ====================================================
  async addCustomerLog(customerId: string, level: LogLevel, text: string, session?: ClientSession): Promise<CustomerLog> {
    const logData = { customer: new Types.ObjectId(customerId), logLevel: level, text };
    
    if (session) {
      return await this.customerLogModel.create([logData], { session }).then(docs => docs[0]);
    } else {
      return await this.customerLogModel.create(logData);
    }
  }

  async deleteCustomerLog(customerId: string, logId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.customerLogModel.deleteOne({_id: new Types.ObjectId(logId), customer: new Types.ObjectId(customerId)}, { session }).exec();
    return { message: 'Log deleted' };
  }

  async deleteAllCustomerLogs(customerId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.customerLogModel.deleteMany({ customer: new Types.ObjectId(customerId) }, { session });
    return { message: 'Logs deleted' };
  }

  async getAllCustomerLogs(
    customerId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    const totalItems = await this.customerLogModel.countDocuments({ customer: new Types.ObjectId(customerId) }).exec();
    const logs = await this.customerLogModel.find({ customer: new Types.ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(LogDto, logs, { excludeExtraneousValues: true });
    return { items, pagination };
  }



  // ====================================================
  // EMPLOYEE LOG 
  // ====================================================
  async addEmployeeLog(employeeId: string, level: LogLevel, text: string, session?: ClientSession): Promise<EmployeeLog> {
    const logData = { employee: new Types.ObjectId(employeeId), logLevel: level, text };
    if (session) {
      return await this.employeeLogModel.create([logData], { session }).then(docs => docs[0]);
    } else {
      return await this.employeeLogModel.create(logData);
    }
  }

  async deleteEmployeeLog(employeeId: string, logId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.employeeLogModel.deleteOne({_id: new Types.ObjectId(logId), employee: new Types.ObjectId(employeeId)}, { session }).exec();
    return { message: 'Log deleted' };
  }

  async deleteAllEmployeeLogs(employeeId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.employeeLogModel.deleteMany({employee: new Types.ObjectId(employeeId)}, { session }).exec();
    return { message: 'Logs deleted' };
  }

  async getAllEmployeeLogs(
    employeeId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    const totalItems = await this.employeeLogModel.countDocuments({ employee: new Types.ObjectId(employeeId) }).exec();
    const logs = await this.employeeLogModel.find({ employee: new Types.ObjectId(employeeId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(LogDto, logs, { excludeExtraneousValues: true });
    return { items, pagination };
  }



  // ====================================================
  // ORDER LOG 
  // ====================================================
  async addOrderLog(orderId: string, level: LogLevel, text: string, session?: ClientSession): Promise<OrderLog> {
    const logData = { order: new Types.ObjectId(orderId), logLevel: level, text };
    if (session) {
      return await this.orderLogModel.create([logData], { session }).then(docs => docs[0]);
    } else {
      return await this.orderLogModel.create(logData);
    }
  }

  async deleteOrderLog(orderId: string, logId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.orderLogModel.deleteOne({_id: new Types.ObjectId(logId), order: new Types.ObjectId(orderId)}, { session }).exec();
    return { message: 'Log deleted' };
  }

  async deleteAllOrderLogs(orderId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.orderLogModel.deleteMany({order: new Types.ObjectId(orderId)}, { session }).exec();
    return { message: 'Logs deleted' };
  }

  async getAllOrderLogs(
    orderId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    const totalItems = await this.orderLogModel.countDocuments({ order: new Types.ObjectId(orderId) }).exec();
    const logs = await this.orderLogModel.find({ order: new Types.ObjectId(orderId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(LogDto, logs, { excludeExtraneousValues: true });
    return { items, pagination };
  }



  // ====================================================
  // PRODUCT LOG 
  // ====================================================
  async addProductLog(productId: string, level: LogLevel, text: string, session?: ClientSession): Promise<ProductLog> {
    const logData = { product: new Types.ObjectId(productId), logLevel: level, text };
    
    if (session) {
      return await this.productLogModel.create([logData], { session }).then(docs => docs[0]);
    } else {
      return await this.productLogModel.create(logData);
    }
  }

  async deleteProductLog(productId: string, logId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.productLogModel.deleteOne({_id: new Types.ObjectId(logId), product: new Types.ObjectId(productId)}, { session }).exec();
    return { message: 'Log deleted' };
  }

  async deleteAllProductLogs(productId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.productLogModel.deleteMany({ product: new Types.ObjectId(productId) }, { session });
    return { message: 'Logs deleted' };
  }

  async getAllProductLogs(
    productId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    const totalItems = await this.productLogModel.countDocuments({ product: new Types.ObjectId(productId) }).exec();
    const logs = await this.productLogModel.find({ product: new Types.ObjectId(productId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(LogDto, logs, { excludeExtraneousValues: true });
    return { items, pagination };
  }



  // ====================================================
  // SELLER LOG 
  // ====================================================
  async addSellerLog(sellerId: string, level: LogLevel, text: string, session?: ClientSession): Promise<SellerLog> {
    const logData = { seller: new Types.ObjectId(sellerId), logLevel: level, text };
    if (session) {
      return await this.sellerLogModel.create([logData], { session }).then(docs => docs[0]);
    } else {
      return await this.sellerLogModel.create(logData);
    }
  }

  async deleteSellerLog(sellerId: string, logId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.sellerLogModel.deleteOne({_id: new Types.ObjectId(logId), seller: new Types.ObjectId(sellerId)}, { session }).exec();
    return { message: 'Log deleted' };
  }

  async deleteAllSellerLogs(sellerId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.sellerLogModel.deleteMany({ seller: new Types.ObjectId(sellerId) }, { session });
    return { message: 'Logs deleted' };
  }

  async getAllSellerLogs(
    sellerId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    const totalItems = await this.sellerLogModel.countDocuments({ seller: new Types.ObjectId(sellerId) }).exec();
    const logs = await this.sellerLogModel.find({ seller: new Types.ObjectId(sellerId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(LogDto, logs, { excludeExtraneousValues: true });
    return { items, pagination };
  }



  // ====================================================
  // SHOP PRODUCT
  // ====================================================
  async addShopProductLog(shopProductId: string, level: LogLevel, text: string,session?: ClientSession): Promise<ShopProductLog> {
    const logData = {shopProduct: new Types.ObjectId(shopProductId), logLevel: level, text};
    
    if (session) {
      return await this.shopProductLogModel.create([logData], { session }).then(docs => docs[0]);
    } else {
      return await this.shopProductLogModel.create(logData);
    }
  }
  
  async deleteShopProductLog(shopProductId: string, logId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.shopProductLogModel.deleteOne({_id: new Types.ObjectId(logId), shopProduct: new Types.ObjectId(shopProductId)}, { session }).exec();
    return { message: 'Log deleted' };
  }

  async deleteAllShopProductLogs(shopProductId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.shopProductLogModel.deleteMany({shopProduct: new Types.ObjectId(shopProductId)}, { session }).exec();
    return { message: 'Logs deleted' };
  }

  async getAllShopProductLogs(
    shopProductId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    const totalItems = await this.shopProductLogModel.countDocuments({ shopProduct: new Types.ObjectId(shopProductId) }).exec();
    const logs = await this.shopProductLogModel.find({ shopProduct: new Types.ObjectId(shopProductId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(LogDto, logs, { excludeExtraneousValues: true });
    return { items, pagination };
  }



  // ====================================================
  // SHIFT
  // ====================================================
  async addShiftLog(shiftId: string, level: LogLevel, text: string, session?: ClientSession): Promise<ShiftLog> {
    const logData = { shift: new Types.ObjectId(shiftId), logLevel: level, text };
    if (session) {
      return await this.shiftLogModel.create([logData], { session }).then(docs => docs[0]);
    } else {
      return await this.shiftLogModel.create(logData);
    }
  }

  async deleteShiftLog(shiftId: string, logId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.shiftLogModel.deleteOne({_id: new Types.ObjectId(logId), shift: new Types.ObjectId(shiftId)}, { session }).exec();
    return { message: 'Log deleted' };
  }

  async deleteAllShiftLogs(shiftId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.shiftLogModel.deleteMany({shift: new Types.ObjectId(shiftId)}, { session }).exec();
    return { message: 'Logs deleted' };
  }

  async getAllShiftLogs(
    shiftId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    const totalItems = await this.shiftLogModel.countDocuments({ shift: new Types.ObjectId(shiftId) }).exec();
    const logs = await this.shiftLogModel.find({ shift: new Types.ObjectId(shiftId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(LogDto, logs, { excludeExtraneousValues: true });
    return { items, pagination };
  }



  // ====================================================
  // SHOP
  // ====================================================
  async addShopLog(shopId: string, level: LogLevel, text: string, session?: ClientSession): Promise<ShopLog> {
    const logData = {shop: new Types.ObjectId(shopId),logLevel: level,text };
    if (session) {
      return await this.shopLogModel.create([logData], { session }).then(docs => docs[0]);
    } else {
      return await this.shopLogModel.create(logData);
    }
  }

  async deleteShopLog(shopId: string, logId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.shopLogModel.deleteOne({_id: new Types.ObjectId(logId), shop: new Types.ObjectId(shopId)}, { session }).exec();
    return { message: 'Log deleted' };
  }

  async deleteAllShopLogs(shopId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.shopLogModel.deleteMany({ shop: new Types.ObjectId(shopId) }, { session }).exec();
    return { message: 'Logs deleted' };
  }

  async getAllShopLogs(
    shopId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    const totalItems = await this.shopLogModel.countDocuments({ shop: new Types.ObjectId(shopId) }).exec();
    const logs = await this.shopLogModel.find({ shop: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(LogDto, logs, { excludeExtraneousValues: true });
    return { items, pagination };
  }


  // ====================================================
  // SHOP ACCOUNT
  // ====================================================
  async addShopAccountLog(shopAccountId: string, level: LogLevel, text: string, session?: ClientSession): Promise<ShopAccountLog> {
    const logData = {shopAccount: new Types.ObjectId(shopAccountId),logLevel: level,text };
    if (session) {
      return await this.shopAccountLogModel.create([logData], { session }).then(docs => docs[0]);
    } else {
      return await this.shopAccountLogModel.create(logData);
    }
  }

  async deleteShopAccountLog(shopAccountId: string, logId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.shopAccountLogModel.deleteOne({_id: new Types.ObjectId(logId), shopAccount: new Types.ObjectId(shopAccountId)}, { session }).exec();
    return { message: 'Log deleted' };
  }

  async deleteAllShopAccountLogs(shopAccountId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.shopAccountLogModel.deleteMany({ shopAccount: new Types.ObjectId(shopAccountId) }, { session }).exec();
    return { message: 'Logs deleted' };
  }

  async getAllShopAccountLogs(
    shopAccountId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    const totalItems = await this.shopAccountLogModel.countDocuments({ shopAccount: new Types.ObjectId(shopAccountId) }).exec();
    const logs = await this.shopAccountLogModel.find({ shopAccount: new Types.ObjectId(shopAccountId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(LogDto, logs, { excludeExtraneousValues: true });
    return { items, pagination };
  }


  // ====================================================
  // SELLER ACCOUNT
  // ====================================================
  async addSellerAccountLog(sellerAccountId: string, level: LogLevel, text: string, session?: ClientSession): Promise<SellerAccountLog> {
    const logData = {sellerAccount: new Types.ObjectId(sellerAccountId),logLevel: level,text };
    if (session) {
      return await this.sellerAccountLogModel.create([logData], { session }).then(docs => docs[0]);
    } else {
      return await this.sellerAccountLogModel.create(logData);
    }
  }

  async deleteSellerAccountLog(sellerAccountId: string, logId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.sellerAccountLogModel.deleteOne({_id: new Types.ObjectId(logId), sellerAccount: new Types.ObjectId(sellerAccountId)}, { session }).exec();
    return { message: 'Log deleted' };
  }

  async deleteAllSellerAccountLogs(sellerAccountId: string, session?: ClientSession): Promise<MessageResponseDto> {
    await this.sellerAccountLogModel.deleteMany({ sellerAccount: new Types.ObjectId(sellerAccountId) }, { session }).exec();
    return { message: 'Logs deleted' };
  }

  async getAllSellerAccountLogs(
    sellerAccountId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    const totalItems = await this.sellerAccountLogModel.countDocuments({ sellerAccount: new Types.ObjectId(sellerAccountId) }).exec();
    const logs = await this.sellerAccountLogModel.find({ sellerAccount: new Types.ObjectId(sellerAccountId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(LogDto, logs, { excludeExtraneousValues: true });
    return { items, pagination };
  }
}