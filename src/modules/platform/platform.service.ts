import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { PlatformModel, Platform } from './platform.schema';
import { checkId, assignField } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { IMAGES_PORT, ImagesPort } from 'src/infra/images/images.port';



@Injectable()
export class PlatformService {
  constructor(
    @InjectModel(Platform.name) private readonly platformModel: PlatformModel,
    @Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort,
  ) {}

  async getAdminByTelegramId(telegramId: number): Promise<Platform> {
    const admin = await this.platformModel.findOne({ telegramId }).select('+telegramId +telegramUsername').exec();
    if (!admin) throw new UnauthorizedException('Платформа не найдена');
    return admin;
  }






  async getStats(authedAdmin: AuthenticatedUser): Promise<SystemStatsResponseDto> {
    // Делаем параллельные запросы с использованием более быстрого метода estimatedDocumentCount
    const [customersCount, employeesCount, sellersCount, shopsCount, ordersCount] = await Promise.all([
      this.customerModel.estimatedDocumentCount(),
      this.employeeModel.estimatedDocumentCount(),
      this.sellerModel.estimatedDocumentCount(),
      this.shopModel.estimatedDocumentCount(),
      this.orderModel.estimatedDocumentCount()
    ]);

    // Создаем результирующий объект
    const result = plainToInstance(SystemStatsResponseDto, {
      customersCount,
      employeesCount,
      sellersCount,
      shopsCount,
      ordersCount,
    }, { excludeExtraneousValues: true });
    
    return result;
  }

  async getUsersToVerify(authedAdmin: AuthenticatedUser): Promise<UserToVerifyResponseDto[]> {
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
    const result = plainToInstance(UserToVerifyResponseDto, allUsersToVerify, { 
      excludeExtraneousValues: true 
    }) as UserToVerifyResponseDto[];
    
    return result;
  }

}