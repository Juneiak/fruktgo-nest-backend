
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop } from '../../schemas/shop.schema';
import { plainToInstance } from 'class-transformer';
import {
  ShopForShopPreviewResponseDto,
  ShopProductForShopPreviewResponseDto,
  ShopProductForShopFullResponseDto,
  OpenShiftByEmployeeDto,
  CloseShiftByEmployeeDto,
  RemoveShopProductImageDto,
  UpdateShopProductByEmployeeDto,
  CurrentShopProductsStockDto,
  CurrentShopProductStockResponseDto
} from './shops-for-shop.dtos';
import { MessageResponseDto } from 'src/common/dtos';
import { verifyUserStatus } from 'src/common/utils';
import { ShopStatus } from "src/modules/shop/schemas/shop.schema";
import { EmployeeStatus } from "src/modules/employee/schemas/employee.schema";
import { ShopProduct } from '../../schemas/shop-product.schema';
import {checkId} from 'src/common/utils';
import { Shift } from '../../schemas/shift.schema';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { Employee } from 'src/modules/employee/schemas/employee.schema';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { UploadsService } from 'src/common/modules/uploads/uploads.service';
import { EntityType, ImageType } from 'src/common/modules/uploads/uploaded-file.schema';
import { NotificationService } from 'src/modules/notification/notification.service';
import {AuthenticatedUser, AuthenticatedEmployee, UserType} from 'src/common/types';


@Injectable()
export class ShopForShopService {
  constructor(
    @InjectModel('Shop') private shopModel: Model<Shop>,
    @InjectModel('ShopProduct') private shopProductModel: Model<ShopProduct>,
    @InjectModel('Shift') private shiftModel: Model<Shift>,
    @InjectModel('Employee') private employeeModel: Model<Employee>,
    private logsService: LogsService,
    private uploadsService: UploadsService,
    private notificationService: NotificationService
  ) {}
  
  // ====================================================
  // COMMON 
  // ====================================================
  async getShopPreviewInfo(authedShop: AuthenticatedUser): Promise<ShopForShopPreviewResponseDto> {
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).populate('currentShift pinnedEmployees').exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
  
    return plainToInstance(ShopForShopPreviewResponseDto, shop, { excludeExtraneousValues: true });
  }


  // ====================================================
  // SHOP PRODUCTS 
  // ====================================================
  async getShopProduct(authedShop: AuthenticatedUser, shopProductId: string): Promise<ShopProductForShopFullResponseDto> {
    checkId([shopProductId]);
    const foundShopProduct = await this.shopProductModel.findOne({pinnedTo: new Types.ObjectId(authedShop.id), _id: new Types.ObjectId(shopProductId)})
    .select('shopProductId pinnedTo product stockQuantity status images')
    .populate({
      path: 'images',
      select: '_id imageId createdAt',
      options: { sort: { createdAt: -1 } },
    })
    .populate({
      path: 'product',
      select: 'productId cardImage productArticle productName category price measuringScale stepRate aboutProduct origin',
    })
    .lean({ virtuals: true }).exec();
    if (!foundShopProduct) throw new NotFoundException('Товар не найден');
    
    return plainToInstance(ShopProductForShopFullResponseDto, foundShopProduct, { excludeExtraneousValues: true });
  }


  async getShopProducts(authedShop: AuthenticatedUser): Promise<ShopProductForShopPreviewResponseDto[]> {
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');

    const foundShopProducts = await this.shopProductModel.find({ pinnedTo: shop._id }).populate('product').lean({ virtuals: true }).exec();
    if (!foundShopProducts) throw new NotFoundException('Товары не найдены');
    
    return plainToInstance(ShopProductForShopPreviewResponseDto, foundShopProducts, { excludeExtraneousValues: true });
  }


  async removeShopProductImage(
    authedShop: AuthenticatedUser,
    authedEmployee: AuthenticatedEmployee,
    shopProductId: string,
    shopProductImageId: string,
    dto: RemoveShopProductImageDto
  ): Promise<MessageResponseDto> {
    // Получаем сессию MongoDB для транзакций
    const session = await this.shopModel.db.startSession();
    try {
      // Начинаем транзакцию
      session.startTransaction();
      
      // Проверяем валидность ID
      checkId([shopProductId, shopProductImageId]);
      
      // Проверяем существование магазина и права на него
      const foundShop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id verifiedStatus isBlocked currentShift shopName owner').populate('currentShift', '_id shiftId openedBy').session(session).lean().exec();
      if (!foundShop) throw new NotFoundException('Магазин не найден');
      
      // Проверяем статус сотрудника
      const employee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).select('_id verifiedStatus isBlocked pinnedTo employer').session(session).lean().exec();
      if (!employee) throw new NotFoundException('Сотрудник не найден');
      verifyUserStatus(employee);
      
      // Проверяем привязку сотрудника к продавцу
      if (!employee.employer || employee.employer.toString() !== foundShop.owner.toString()) throw new ForbiddenException('Сотрудник не привязан к данному продавцу');
      // Проверяем привязку сотрудника к магазину
      if (!employee.pinnedTo || employee.pinnedTo.toString() !== foundShop._id.toString()) throw new ForbiddenException('Сотрудник не привязан к данному магазину');

      // Находим продукт в магазине
      const shopProduct = await this.shopProductModel.findOne({ _id: new Types.ObjectId(shopProductId), pinnedTo: foundShop._id }).session(session).exec();
      if (!shopProduct) throw new NotFoundException('Продукт в магазине не найден');

      // Проверяем, существует ли указанное изображение в массиве images
      const imageIndex = shopProduct.images.findIndex(img => img.toString() === shopProductImageId);
      if (imageIndex === -1) throw new NotFoundException('Изображение не найдено у данного продукта');
      
      // Удаляем изображение из массива images
      shopProduct.images.splice(imageIndex, 1);
      
      // Сохраняем обновленный продукт в рамках транзакции
      await shopProduct.save({ session });

      // Удаляем изображение из базы
      await this.uploadsService.deleteFile(shopProductImageId, session);

      // Фиксируем транзакцию
      await session.commitTransaction();
      
      // Добавляем запись в лог магазина
      if (foundShop.currentShift) await this.logsService.addShiftLog(foundShop.currentShift.toString(), LogLevel.LOW,
        `Сотрудник ${employee.employeeName} удалил изображение продукта ${shopProduct._id.toString()} в магазине ${foundShop.shopName}
        ${dto.comment ? `Комментарий от сотрудника: ${dto.comment}` : ''}`,
      );

      await this.logsService.addShopProductLog(shopProduct._id.toString(), LogLevel.LOW,
        `Сотрудник ${employee.employeeName} удалил изображение продукта ${shopProduct._id.toString()} в магазине ${foundShop.shopName}
        ${dto.comment ? `Комментарий от сотрудника: ${dto.comment}` : ''}`,
      );

      return plainToInstance(MessageResponseDto, { message: 'Изображение продукта успешно удалено' });
      
    } catch (error) {
      // Отменяем транзакцию при ошибке
      await session.abortTransaction();
      
      // Пробрасываем известные типы ошибок
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof BadRequestException) {
        throw error;
      }
      
      console.error('Ошибка при удалении изображения продукта:', error);
      throw new BadRequestException('Не удалось удалить изображение продукта');
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }


  async addNewShopProductImage(
    authedShop: AuthenticatedUser,
    authedEmployee: AuthenticatedEmployee,
    shopProductId: string,
    newShopProductImage: Express.Multer.File
  ): Promise<ShopProductForShopFullResponseDto> {
    // Получаем сессию MongoDB для транзакций
    const session = await this.shopModel.db.startSession();
    
    try {
      // Начинаем транзакцию
      session.startTransaction();
      
      // Проверяем валидность ID
      checkId([shopProductId]);
      
      // Проверка наличия файла
      if (!newShopProductImage) throw new BadRequestException('Файл изображения не был предоставлен');
      
      // Проверяем существование магазина и права на него
      const foundShop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id verifiedStatus isBlocked owner currentShift').session(session).lean().exec();
      if (!foundShop) throw new NotFoundException('Магазин не найден');
      
      // Проверяем статус сотрудника
      const employee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).select('_id employeeName verifiedStatus isBlocked pinnedTo employer').session(session).lean().exec();
      if (!employee) throw new NotFoundException('Сотрудник не найден');
      // verifyUserStatus(employee);
      
      // Проверяем привязку сотрудника к продавцу
      if (!employee.employer || employee.employer.toString() !== foundShop.owner.toString()) throw new ForbiddenException('Сотрудник не привязан к данному продавцу');
      // Проверяем привязку сотрудника к магазину
      if (!employee.pinnedTo || employee.pinnedTo.toString() !== foundShop._id.toString()) throw new ForbiddenException('Сотрудник не привязан к данному магазину');
      
      // Находим продукт в магазине
      const shopProduct = await this.shopProductModel.findOne({_id: new Types.ObjectId(shopProductId), pinnedTo: foundShop._id}).session(session).exec();
      if (!shopProduct) throw new NotFoundException('Продукт в магазине не найден');
      
      // Загружаем изображение с использованием транзакции
      const uploadedImage = await this.uploadsService.uploadImage({
        file: newShopProductImage,
        accessLevel: 'public',
        entityType: EntityType.shopProduct,
        entityId: shopProduct._id.toString(),
        imageType: ImageType.shopProductImage,
        // allowedUsers: [
        //   { userId: authedShop.id, role: UserType.SHOP },
        //   { userId: foundShop.owner.toString(), role: UserType.SELLER },
        // ],
        session
      });
      
      // Добавляем загруженное изображение в массив images продукта
      shopProduct.images.push(uploadedImage._id);
      
      // Сохраняем обновленный продукт в рамках транзакции
      await shopProduct.save({ session });

      await this.logsService.addShopProductLog(shopProduct._id.toString(), LogLevel.LOW,
        `Сотрудник ${employee.employeeName} добавил новое изображение продукта ${shopProduct.product.toString()}`,
        session
      );
      if (foundShop.currentShift) await this.logsService.addShiftLog(foundShop.currentShift.toString(), LogLevel.LOW,
        `Сотрудник ${employee.employeeName} добавил новое изображение продукта ${shopProduct.product.toString()}`,
        session
      );
      
      // Фиксируем транзакцию
      await session.commitTransaction();

      return await this.getShopProduct(authedShop, shopProductId);
    } catch (error) {
      // Отменяем транзакцию при ошибке
      await session.abortTransaction();
      
      // Пробрасываем известные типы ошибок
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof BadRequestException) {
        throw error;
      }
      
      console.error('Ошибка при добавлении изображения продукта:', error);
      throw new BadRequestException('Не удалось добавить изображение продукта');
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }


  async updateShopProduct(
    authedShop: AuthenticatedUser, 
    authedEmployee: AuthenticatedEmployee,
    shopProductId: string,
    dto: UpdateShopProductByEmployeeDto
  ): Promise<ShopProductForShopFullResponseDto> {
    checkId([shopProductId]);
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id))
    .select('_id owner currentShift isBlocked verifiedStatus')
    .populate('currentShift', 'openedBy _id')
    .lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    
    const foundEmployee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).select('_id employeeName verifiedStatus isBlocked pinnedTo employer').lean().exec();
    if (!foundEmployee) throw new NotFoundException('Сотрудник не найден');

    if (!foundEmployee.employer || foundEmployee.employer.toString() !== shop.owner.toString()) throw new ForbiddenException('Сотрудник не привязан к данному продавцу');
    if (!foundEmployee.pinnedTo || foundEmployee.pinnedTo.toString() !== shop._id.toString()) throw new ForbiddenException('Сотрудник не привязан к данному магазину');
    // verifyUserStatus(foundEmployee);

    const foundShopProduct = await this.shopProductModel.findOne({ 
      pinnedTo: shop._id,
      _id: new Types.ObjectId(shopProductId) 
    }).populate('product').exec();
    if (!foundShopProduct) throw new NotFoundException('этот товар не найден в этом магазине');

    if (dto.newStockQuantity !== undefined) {
      foundShopProduct.stockQuantity = dto.newStockQuantity;
    }
    if (dto.newStatus !== undefined) {
      foundShopProduct.status = dto.newStatus;
    }
    
    // Сохраняем изменения
    await foundShopProduct.save();

    // Логирование в логи продукта магазина
    await this.logsService.addShopProductLog(foundShopProduct._id.toString(), LogLevel.MEDIUM,
      `Сотрудник ${foundEmployee.employeeName}(${foundEmployee._id.toString()}) обновили товар ${foundShopProduct._id.toString()} в магазине ${shop._id.toString()}:
      ${dto.newStockQuantity ? `Количество на складе c ${foundShopProduct?.stockQuantity} на ${dto.newStockQuantity}` : ''}
      ${dto.newStatus ? `Статус c ${foundShopProduct?.status} на ${dto.newStatus}` : ''}
      ${dto.comment ? `Комментарий от сотрудника: ${dto.comment}` : ''}`
    );

    /// Логирование в логи смены
    if (shop.currentShift) await this.logsService.addShiftLog(shop.currentShift._id.toString(), LogLevel.MEDIUM,
      `Сотрудник ${foundEmployee.employeeName}(${foundEmployee._id.toString()}) обновили товар ${foundShopProduct._id.toString()} на смене (${shop.currentShift._id.toString()}):
      ${dto.newStockQuantity ? `Количество на складе c ${foundShopProduct?.stockQuantity} на ${dto.newStockQuantity}` : ''}
      ${dto.newStatus ? `Статус c ${foundShopProduct?.status} на ${dto.newStatus}` : ''}
      ${dto.comment ? `Комментарий от сотрудника: ${dto.comment}` : ''}`
    );

    return plainToInstance(ShopProductForShopFullResponseDto, foundShopProduct, { excludeExtraneousValues: true });
  }

  async getShopProductStock(authedShop: AuthenticatedUser, dto: CurrentShopProductsStockDto): Promise<CurrentShopProductStockResponseDto[]> {
    // Проверяем магазин
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id').lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    
    // Преобразуем строковые ID в ObjectId для поиска
    const shopProductObjectIds = dto.shopProductIds.map(id => new Types.ObjectId(id));
    
    // Ищем только продукты из списка и выбираем только нужные поля
    const foundShopProducts = await this.shopProductModel
      .find({
        pinnedTo: shop._id,
        _id: { $in: shopProductObjectIds }
      })
      .select('_id shopProductId stockQuantity')
      .lean({ virtuals: true })
      .exec();
    
    // Преобразуем в DTO и возвращаем
    return plainToInstance(CurrentShopProductStockResponseDto, foundShopProducts, { excludeExtraneousValues: true });
  }
  

  // ====================================================
  // SHIFT
  // ====================================================
  async openShiftByEmployee(
    authedShop: AuthenticatedUser, 
    authedEmployee: AuthenticatedEmployee, 
    dto: OpenShiftByEmployeeDto
  ): Promise<ShopForShopPreviewResponseDto> {

    // Проверяем корректность ID магазина
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    verifyUserStatus(shop);
    
    // Проверяем права доступа магазина
    if (!shop._id.equals(new Types.ObjectId(authedShop.id))) throw new ForbiddenException('Недостаточно прав доступа к магазину');
    
    // Проверяем существование сотрудника
    const foundEmployee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).lean().exec();
    if (!foundEmployee) throw new NotFoundException('Сотрудник не найден');
    verifyUserStatus(foundEmployee);
    
    // Проверяем, что сотрудник привязан к этому магазину
    if (foundEmployee.pinnedTo && foundEmployee.pinnedTo.toString() !== shop._id.toString()) throw new ForbiddenException('Сотрудник не привязан к этому магазину');
    
    // Проверяем, нет ли уже открытой смены
    // const existingOpenShift = await this.shiftModel.findOne({
    //   shop: shop._id,
    //   closedAt: null
    // }).lean().exec();
    
    // if (existingOpenShift) throw new BadRequestException('У магазина уже есть открытая смена');
    
    // Создаем новую смену
    const newShift = new this.shiftModel({
      shop: shop._id,
      openedAt: dto.openAt || new Date(),
      openComment: dto.comment,
      openedBy: {
        employee: foundEmployee._id,
        employeeName: foundEmployee.employeeName
      }
    });
    
    const savedShift = await newShift.save();
    
    // Обновляем магазин, записывая текущую смену
    await this.shopModel.findByIdAndUpdate(shop._id, {
      currentShift: savedShift._id,
      status: ShopStatus.OPENED
    }).exec();
    
    // Увеличиваем счетчик смен у сотрудника и меняем статус на работает
    await this.employeeModel.findByIdAndUpdate(foundEmployee._id, {
      $inc: { totalShifts: 1 },
      status: EmployeeStatus.WORKING
    }).exec();
    
    // Логирование действия
    await this.logsService.addShiftLog(savedShift._id.toString(), LogLevel.MEDIUM, 
      `Смена (${savedShift._id.toString()}) открыта сотрудником ${foundEmployee.employeeName}(${foundEmployee._id.toString()}).
      Комментарий: ${dto.comment}
      Дата открытия: ${savedShift.openedAt}`
    );
    console.log(savedShift);
    this.notificationService.notifySellerAboutShiftUpdate(savedShift._id.toString(), true);
    
    // Преобразуем и возвращаем объект смены
    return this.getShopPreviewInfo(authedShop);
  }
  

  async closeShiftByEmployee(
    authedShop: AuthenticatedUser, 
    authedEmployee: AuthenticatedEmployee,
    shiftId: string,
    dto: CloseShiftByEmployeeDto
  ): Promise<ShopForShopPreviewResponseDto> {
    // Проверяем корректность ID магазина и смены
    checkId([shiftId]);
    
    // Находим магазин
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    
    // Проверяем права доступа магазина
    if (!shop._id.equals(new Types.ObjectId(authedShop.id))) throw new ForbiddenException('Недостаточно прав доступа к магазину');
    
    // Проверяем существование сотрудника
    const foundEmployee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).lean().exec();
    if (!foundEmployee) throw new NotFoundException('Сотрудник не найден');

    // Проверяем статус сотрудника
    verifyUserStatus(foundEmployee);
    // Проверяем, что сотрудник привязан к этому магазину
    if (foundEmployee.pinnedTo && foundEmployee.pinnedTo.toString() !== shop._id.toString()) throw new ForbiddenException('Сотрудник не привязан к этому магазину');
    
    // Получаем смену по ID
    const shift = await this.shiftModel.findById(new Types.ObjectId(shiftId)).exec();
    if (!shift) throw new NotFoundException('Смена не найдена');
    
    // Проверяем, что смена принадлежит этому магазину
    if (shift.shop.toString() !== shop._id.toString()) throw new ForbiddenException('Смена не принадлежит этому магазину');
  
    // Проверяем, что смена является текущей для магазина
    if (!shop.currentShift || shop.currentShift.toString() !== shift._id.toString()) throw new BadRequestException('Эта смена не является текущей для магазина');
    
    // Проверяем закрыта ли смена по наличию даты закрытия
    if (shift.closedAt) throw new BadRequestException('Смена уже закрыта');
    
    
    // Обновляем смену
    shift.closedAt = dto.closeAt || new Date();
    shift.closeComment = dto.comment;
    shift.closedBy = {
      employee: foundEmployee._id,
      employeeName: foundEmployee.employeeName
    };
    // Добавляем комментарий в логи, так как у схемы Shift нет поля comment
    // И также нет поля status
    
    // У схемы Shift нет поля logs, логи добавляются через сервис shopsCommonService
    
    await shift.save();
    
    // Обновляем магазин, очищая текущую смену
    await this.shopModel.findByIdAndUpdate(shop._id, {
      currentShift: null,
      status: ShopStatus.CLOSED
    }).exec();
    
    // Логирование действия в логах смены
    await this.logsService.addShiftLog(shift._id.toString(), LogLevel.MEDIUM, 
      `Смена (${shift._id.toString()}) закрыта сотрудником ${foundEmployee.employeeName}(${foundEmployee._id.toString()}).
      Дата закрытия: ${shift.closedAt}
      Комментарий: ${dto.comment || ''}`
    );
    
    // Логирование действия в логах магазина
    await this.logsService.addShopLog(shop._id.toString(), LogLevel.MEDIUM, 
      `Смена (${shift._id.toString()}) закрыта сотрудником ${foundEmployee.employeeName}(${foundEmployee._id.toString()}).
      Дата закрытия: ${shift.closedAt}
      Статус магазина изменен на: ${ShopStatus.CLOSED}
      Комментарий: ${dto.comment || ''}`
    );

    this.notificationService.notifySellerAboutShiftUpdate(shift._id.toString(), false);

    // Преобразуем и возвращаем объект смены
    return this.getShopPreviewInfo(authedShop);
  }

    
}