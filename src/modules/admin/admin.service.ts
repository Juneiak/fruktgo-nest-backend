import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { Admin } from './admin.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { AdminResponseDto, SystemStatsToAdminResponseDto, UserToVerifyToAdminResponseDto } from './admin.dtos';
import { UserType, VerifiedStatus } from 'src/common/types';
import { AuthenticatedUser } from 'src/common/types';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel('Admin') private adminModel: Model<Admin>,
    @InjectModel('Customer') private customerModel: Model<any>,
    @InjectModel('Employee') private employeeModel: Model<any>,
    @InjectModel('Seller') private sellerModel: Model<any>,
    @InjectModel('Shop') private shopModel: Model<any>,
    @InjectModel('Order') private orderModel: Model<any>,
  ) {}

  async getAdmins(): Promise<Admin[]> {
    return this.adminModel.find().exec();
  }

  async getAdminByTelegramId(telegramId: number): Promise<AdminResponseDto> {
    const admin = await this.adminModel.findOne({ telegramId }).select('+telegramId +telegramUsername').exec();
    if (!admin) throw new UnauthorizedException('Администратор не найден');
    return plainToInstance(AdminResponseDto, admin, { excludeExtraneousValues: true });
  }

  async getStats(authedAdmin: AuthenticatedUser): Promise<SystemStatsToAdminResponseDto> {
    // Делаем параллельные запросы с использованием более быстрого метода estimatedDocumentCount
    const [customersCount, employeesCount, sellersCount, shopsCount, ordersCount] = await Promise.all([
      this.customerModel.estimatedDocumentCount(),
      this.employeeModel.estimatedDocumentCount(),
      this.sellerModel.estimatedDocumentCount(),
      this.shopModel.estimatedDocumentCount(),
      this.orderModel.estimatedDocumentCount()
    ]);

    // Создаем результирующий объект
    const result = plainToInstance(SystemStatsToAdminResponseDto, {
      customersCount,
      employeesCount,
      sellersCount,
      shopsCount,
      ordersCount,
    }, { excludeExtraneousValues: true });
    
    return result;
  }

  async getUsersToVerify(authedAdmin: AuthenticatedUser): Promise<UserToVerifyToAdminResponseDto[]> {
    // Параллельно получаем пользователей для проверки из разных коллекций
    // Используем lean() для оптимизации и выбираем _id вместо виртуального id
    const [customersToVerify, employeesToVerify, sellersToVerify, shopsToVerify] = await Promise.all([
      // Клиенты, ожидающие проверки
      this.customerModel.find({
        verifiedStatus: { $in: [VerifiedStatus.NOT_VERIFIED, VerifiedStatus.IS_CHECKING] },
      }).select('_id telegramId telegramUsername verifiedStatus isBlocked createdAt').lean({isVirtuals: true}).exec(),
      
      // Сотрудники, ожидающие проверки
      this.employeeModel.find({
        verifiedStatus: { $in: [VerifiedStatus.NOT_VERIFIED, VerifiedStatus.IS_CHECKING] },
      }).select('_id telegramId telegramUsername verifiedStatus isBlocked createdAt').lean({isVirtuals: true}).exec(),
      
      // Продавцы, ожидающие проверки
      this.sellerModel.find({
        verifiedStatus: { $in: [VerifiedStatus.NOT_VERIFIED, VerifiedStatus.IS_CHECKING] },
      }).select('_id telegramId telegramUsername verifiedStatus isBlocked createdAt').lean({isVirtuals: true}).exec(),
      
      // Магазины, ожидающие проверки
      this.shopModel.find({
        verifiedStatus: { $in: [VerifiedStatus.NOT_VERIFIED, VerifiedStatus.IS_CHECKING] },
      }).select('_id telegramId telegramUsername verifiedStatus isBlocked createdAt').lean({isVirtuals: true}).exec(),
    ]);
    
    // Объединяем результаты с преобразованием _id в id для DTO
    const allUsersToVerify = [
      ...customersToVerify.map(user => ({ ...user, id: String(user._id), type: UserType.CUSTOMER })),
      ...employeesToVerify.map(user => ({ ...user, id: String(user._id), type: UserType.EMPLOYEE })),
      ...sellersToVerify.map(user => ({ ...user, id: String(user._id), type: UserType.SELLER })),
      ...shopsToVerify.map(user => ({ ...user, id: String(user._id), type: UserType.SHOP })),
    ];
    
    // Преобразуем в DTO
    const result = plainToInstance(UserToVerifyToAdminResponseDto, allUsersToVerify, { 
      excludeExtraneousValues: true 
    }) as UserToVerifyToAdminResponseDto[];
    
    return result;
  }

}