import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { MessageResponseDto } from 'src/common/dtos';
import { verifyUserStatus } from 'src/common/utils';
import {checkId} from 'src/common/utils';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { LogsService } from 'src/common/modules/logs/logs.service';
import { UploadsService } from 'src/common/modules/uploads/uploads.service';
import { EntityType, ImageType } from 'src/common/modules/uploads/uploaded-file.schema';
import {AuthenticatedUser, AuthenticatedEmployee} from 'src/common/types';
import { ShopProductStockQueryFilterDto } from './shop-product.shop.filter.dto';
import { ShopModel } from 'src/modules/shop/shop/shop.schema';
import { ShopProductModel } from 'src/modules/shop/shop-product/shop-product.schema';
import { EmployeeModel } from 'src/modules/employee/employee.schema';
import {
  ShopProductFullResponseDto,
  ShopProductPreviewResponseDto,
  CurrentShopProductStockResponseDto
} from './shop-product.shop.response.dto';
import { RemoveShopProductImageDto } from './shop-product.shop.request.dto';
import { UpdateShopProductByEmployeeDto } from './shop-product.shop.request.dto';

@Injectable()
export class ShopProductShopService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
    @InjectModel('ShopProduct') private shopProductModel: ShopProductModel,
    @InjectModel('Employee') private employeeModel: EmployeeModel,
    private logsService: LogsService,
    private uploadsService: UploadsService,
  ) {}
  

  async getShopProduct(authedShop: AuthenticatedUser, shopProductId: string): Promise<ShopProductFullResponseDto> {
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
    
    return plainToInstance(ShopProductFullResponseDto, foundShopProduct, { excludeExtraneousValues: true });
  }


  async getShopProducts(authedShop: AuthenticatedUser): Promise<ShopProductPreviewResponseDto[]> {
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');

    const foundShopProducts = await this.shopProductModel.find({ pinnedTo: shop._id }).populate('product').lean({ virtuals: true }).exec();
    if (!foundShopProducts) throw new NotFoundException('Товары не найдены');
    
    return plainToInstance(ShopProductPreviewResponseDto, foundShopProducts, { excludeExtraneousValues: true });
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
  ): Promise<ShopProductFullResponseDto> {
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
  ): Promise<ShopProductFullResponseDto> {
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

    return plainToInstance(ShopProductFullResponseDto, foundShopProduct, { excludeExtraneousValues: true });
  }


  async getShopProductStock(authedShop: AuthenticatedUser, queryFilter: ShopProductStockQueryFilterDto): Promise<CurrentShopProductStockResponseDto[]> {
    // Проверяем магазин
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).select('_id').lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    
    // Преобразуем строковые ID в ObjectId для поиска
    const shopProductObjectIds = queryFilter.shopProductIds.map(id => new Types.ObjectId(id));
    
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
}