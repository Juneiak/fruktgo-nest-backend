import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { checkEntityStatus, transformPaginatedResult } from 'src/common/utils';
import {checkId} from 'src/common/utils';
import { LogLevel } from "src/infra/logs/infrastructure/log.schema";
import { LogsService } from 'src/infra/log/application/log.service';
import { UploadsService } from 'src/infra/images/images.service';
import { EntityType, ImageType } from 'src/infra/images/infrastructure/image.schema';
import {AuthenticatedUser, AuthenticatedEmployee} from 'src/common/types';
import { UserType } from "src/common/enums/common.enum";
import { ShopProductsStockQueryDto } from './shop.shop-products.query.dtos';
import { ShopModel } from 'src/modules/shop/shop.schema';
import { ShopProductModel, ShopProductStatus } from 'src/modules/shop-product/shop-product.schema';
import { EmployeeModel } from 'src/modules/employee/employee.schema';
import {
  ShopProductResponseDto,
  CurrentShopProductStockResponseDto
} from './shop.shop-products.response.dtos';
import {
   RemoveShopProductImageDto,
   UpdateShopProductByEmployeeDto
} from './shop.shop-products.request.dtos';

@Injectable()
export class ShopShopProductsRoleService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
    @InjectModel('ShopProduct') private shopProductModel: ShopProductModel,
    @InjectModel('Employee') private employeeModel: EmployeeModel,
    private logsService: LogsService,
    private uploadsService: UploadsService,
  ) {}
  

  // async getShopProduct(authedShop: AuthenticatedUser, shopProductId: string): Promise<ShopProductResponseDto> {
  //   checkId([shopProductId]);
  //   const foundShopProduct = await this.shopProductModel.findOne({pinnedTo: new Types.ObjectId(authedShop.id), _id: new Types.ObjectId(shopProductId)})
  //   .populate({
  //     path: 'images',
  //     select: '_id imageId createdAt',
  //     options: { sort: { createdAt: -1 } },
  //   })
  //   .populate({
  //     path: 'product',
  //     select: 'productId cardImage productArticle productName category price measuringScale stepRate aboutProduct origin',
  //   })
  //   .lean({ virtuals: true }).exec();
  //   if (!foundShopProduct) throw new NotFoundException('Товар не найден или не принадлежит вашему магазину');
    
  //   return plainToInstance(ShopProductResponseDto, foundShopProduct, { excludeExtraneousValues: true });
  // }


  // async getShopProducts(
  //   authedShop: AuthenticatedUser,
  //   paginationQuery: PaginationQueryDto
  // ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
  //   const { page = 1, pageSize = 10 } = paginationQuery;

  //   const foundShopProducts = await this.shopProductModel.paginate(
  //     { pinnedTo: new Types.ObjectId(authedShop.id) },
  //     { 
  //       page, limit: pageSize, lean: true, leanWithId: false,
  //       populate: { path: 'product' } 
  //     });
  //   if (!foundShopProducts) throw new NotFoundException('Товары не найдены или не принадлежат вашему магазину');
    
  //   return transformPaginatedResult(foundShopProducts, ShopProductResponseDto);
  // }


  // async removeShopProductImage(
  //   authedShop: AuthenticatedUser,
  //   authedEmployee: AuthenticatedEmployee,
  //   shopProductId: string,
  //   imageId: string,
  //   dto: RemoveShopProductImageDto
  // ): Promise<ShopProductResponseDto> {
  //   checkId([shopProductId, imageId]);
  //   const session = await this.shopModel.db.startSession();
  //   try {
  //     const updatedShopProductId = await session.withTransaction(async () => {
  //       const isEmployeeValid = await checkEntityStatus(
  //         this.employeeModel,
  //         { _id: new Types.ObjectId(authedEmployee.id), pinnedTo: new Types.ObjectId(authedShop.id) },
  //         { session }
  //       );
  //       if (!isEmployeeValid) throw new NotFoundException('Сотрудник не найден или не привязан к вашему магазину или заблокирован или не верифицирован');

  //       const isShopValid = await checkEntityStatus(
  //         this.shopModel,
  //         { _id: new Types.ObjectId(authedShop.id) },
  //         { session }
  //       );
  //       if (!isShopValid) throw new NotFoundException('Магазин не найден или не принадлежит данному сотруднику');

  //       const foundShopProduct = await this.shopProductModel.findOne({_id: new Types.ObjectId(shopProductId), pinnedTo: new Types.ObjectId(authedShop.id)}).session(session).exec();
  //       if (!foundShopProduct) throw new NotFoundException('Товар не найден или не принадлежит вашему магазину');


  //       const imageIdToDelete = foundShopProduct.images.find(img => img.toString() === imageId);
  //       if (!imageIdToDelete) throw new NotFoundException('Изображение не найдено в данном продукте');

  //       foundShopProduct.images = foundShopProduct.images.filter(img => img.toString() !== imageIdToDelete.toString());
  //       await foundShopProduct.save({ session });

  //       await this.logsService.addShopProductLog(
  //         foundShopProduct._id.toString(), 
  //         `Сотрудник ${authedEmployee.employeeName} удалил изображение продукта ${dto.comment ? `(${dto.comment})` : ''}`,
  //         { logLevel: LogLevel.MEDIUM, forRoles: [UserType.EMPLOYEE, UserType.SHOP, UserType.SELLER], session }
  //       );
  //       return foundShopProduct._id.toString();
  //     });

  //     if (!updatedShopProductId) throw new NotFoundException('Не удалось удалить изображение продукта');
  //     return this.getShopProduct(authedShop, updatedShopProductId);

  //   } catch (error) {
  //     if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
  //     console.error('Ошибка при удалении изображения продукта:', error);
  //     throw new InternalServerErrorException('Ошибка при удалении изображения продукта');
  //   } finally {
  //     session.endSession();
  //   }
  // }


  // async addNewShopProductImage(
  //   authedShop: AuthenticatedUser,
  //   authedEmployee: AuthenticatedEmployee,
  //   shopProductId: string,
  //   newImage: Express.Multer.File
  // ): Promise<ShopProductResponseDto> {
  //   const session = await this.shopModel.db.startSession();
  //   try {
  //     const updatedShopProductId = await session.withTransaction(async () => {
  //       // 1) проверки
  //       const okEmployee = await checkEntityStatus(
  //         this.employeeModel,
  //         { _id: new Types.ObjectId(authedEmployee.id), pinnedTo: new Types.ObjectId(authedShop.id) },
  //         { session }
  //       );
  //       if (!okEmployee) throw new NotFoundException('Сотрудник не найден/не привязан/заблокирован/не верифицирован');
  
  //       const okShop = await checkEntityStatus(
  //         this.shopModel,
  //         { _id: new Types.ObjectId(authedShop.id) },
  //         { session }
  //       );
  //       if (!okShop) throw new NotFoundException('Магазин не найден или недоступен');
  
  //       // 2) получаем текущие ids (без populate)
  //       const doc = await this.shopProductModel
  //         .findOne({ _id: new Types.ObjectId(shopProductId), pinnedTo: new Types.ObjectId(authedShop.id) })
  //         .select('images')
  //         .session(session);
  //       if (!doc) throw new NotFoundException('Товар не найден в этом магазине');
  
  //       const prevIds = (doc.images ?? []) as Types.ObjectId[];
  
  //       // 3) грузим новое изображение
  //       const createdImage = await this.uploadsService.uploadImage({
  //         file: newImage,
  //         accessLevel: 'public',
  //         entityType: EntityType.shopProduct,
  //         entityId: doc._id.toString(),
  //         imageType: ImageType.shopProductImage,
  //         session,
  //       });
  
  //       // 4) атомарно добавляем id и обрезаем до 3 штук
  //       //    Сохраняем порядок: новые в конец. $slice:-3 оставит последние 3
  //       const after = await this.shopProductModel.findOneAndUpdate(
  //         { _id: doc._id },
  //         { $push: { images: { $each: [createdImage._id], $slice: -3 } } },
  //         { session, new: true, select: 'images' }
  //       );
  //       if (!after) throw new NotFoundException('Не удалось обновить изображения товара');
  
  //       // 5) вычисляем, кто «выпал» при обрезке
  //       const nextIds = (after.images ?? []) as Types.ObjectId[];
  //       const prevPlusNew = [...prevIds.map(String), createdImage._id.toString()];
  //       const kept = new Set(nextIds.map(String));
  //       const removedIds = prevPlusNew.filter(id => !kept.has(id));
  
  //       // 6) удаляем лишние файлы (если появились)
  //       if (removedIds.length > 0) {
  //         await Promise.all(
  //           removedIds.map(id => this.uploadsService.deleteFile(id, session).catch(() => {}))
  //         );
  //       }
  
  //       // 7) лог
  //       await this.logsService.addShopProductLog(
  //         doc._id.toString(),
  //         `
  //           Сотрудник ${authedEmployee.employeeName} добавил изображение ${createdImage.filename}
  //           ${removedIds.length > 0 ? `и автоматически удалился старейшее изображение ${removedIds.join(', ')}` : ''}
  //         `,
  //         { logLevel: LogLevel.MEDIUM, forRoles: [UserType.EMPLOYEE, UserType.SHOP, UserType.SELLER], session }
  //       );
  
  //       // ответ
  //       return doc._id.toString();
  //     });

  //     if (!updatedShopProductId) throw new NotFoundException('Не удалось добавить изображение продукта');
  //     return this.getShopProduct(authedShop, updatedShopProductId);

  //   } catch (error) {
  //     if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
  //     console.error('Ошибка при добавлении изображения продукта:', error);
  //     throw new InternalServerErrorException('Ошибка при добавлении изображения продукта');
  //   } finally {
  //     session.endSession();
  //   }
  // }


  // async updateShopProduct(
  //   authedShop: AuthenticatedUser, 
  //   authedEmployee: AuthenticatedEmployee,
  //   shopProductId: string,
  //   dto: UpdateShopProductByEmployeeDto
  // ): Promise<ShopProductResponseDto> {
  //   checkId([shopProductId]);

  //   const session = await this.shopModel.db.startSession();
  //   try {
  //     const updatedShopProductId = await session.withTransaction(async () => {

  //       const okEmployee = await checkEntityStatus(
  //         this.employeeModel,
  //         { _id: new Types.ObjectId(authedEmployee.id), pinnedTo: new Types.ObjectId(authedShop.id) },
  //         { session }
  //       );
  //       if (!okEmployee) throw new NotFoundException('Сотрудник не найден/не привязан/заблокирован/не верифицирован');

  //       const okShop = await checkEntityStatus(
  //         this.shopModel,
  //         { _id: new Types.ObjectId(authedShop.id) },
  //         { session }
  //       );
  //       if (!okShop) throw new NotFoundException('Магазин не найден или недоступен');
        
  //       const foundShopProduct = await this.shopProductModel.findOne({_id: new Types.ObjectId(shopProductId), pinnedTo: new Types.ObjectId(authedShop.id)}).session(session).exec();
  //       if (!foundShopProduct) throw new NotFoundException('Товар не найден в этом магазине или недоступен');

        
  //       const oldData = foundShopProduct.toObject();
  //       const changes: string[] = [];
        
  //       const isStockQuantityChanged = dto.stockQuantity !== undefined && dto.stockQuantity !== foundShopProduct.stockQuantity;
  //       const isStatusChanged = dto.status !== undefined && dto.status !== foundShopProduct.status;

  //       if (isStockQuantityChanged) {
  //         foundShopProduct.stockQuantity = dto.stockQuantity!;
  //         changes.push(`Количество на складе: ${oldData.stockQuantity} → ${foundShopProduct.stockQuantity}`);
  //       }
  //       if (isStockQuantityChanged && dto.stockQuantity === 0) {
  //         foundShopProduct.status = ShopProductStatus.OUT_OF_STOCK;
  //         changes.push(`Статус: ${oldData.status} → ${ShopProductStatus.OUT_OF_STOCK}`);
  //       } 
  //       else if (isStatusChanged && [ShopProductStatus.ACTIVE, ShopProductStatus.PAUSED].includes(dto.status!)) {
  //         foundShopProduct.status = dto.status!;
  //         changes.push(`Статус: ${oldData.status} → ${dto.status!}`);
  //       }
        
  //       if (changes.length > 0 && foundShopProduct.isModified()) {
  //         await foundShopProduct.save();
  //         await this.logsService.addShopProductLog(
  //           foundShopProduct._id.toString(), 
  //           `Сотрудник ${authedEmployee.employeeName} обновил товар:` + changes.join('. '),
  //           { forRoles: [UserType.EMPLOYEE, UserType.SHOP, UserType.SELLER], logLevel: LogLevel.MEDIUM },
  //         );
  //       }
  //       return foundShopProduct._id.toString();
  //     });

  //     if (!updatedShopProductId) throw new NotFoundException('Не удалось обновить товар');
  //     return this.getShopProduct(authedShop, updatedShopProductId);

  //   } catch (error) {
  //     if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
  //     console.error('Ошибка при обновлении товара:', error);
  //     throw new InternalServerErrorException('Ошибка при обновлении товара');
  //   } finally {
  //     session.endSession();
  //   }
  // }


  // async getShopProductStock(authedShop: AuthenticatedUser, shopProductsStockQuery: ShopProductsStockQueryDto): Promise<CurrentShopProductStockResponseDto[]> {
  //   // Проверяем магазин
  //   const okShop = await checkEntityStatus(
  //     this.shopModel,
  //     { _id: new Types.ObjectId(authedShop.id) },
  //   );
  //   if (!okShop) throw new NotFoundException('Магазин не найден');
    
  //   // Преобразуем строковые ID в ObjectId для поиска
  //   const shopProductObjectIds = shopProductsStockQuery.shopProductIds.map(id => new Types.ObjectId(id));
    
  //   // Ищем только продукты из списка и выбираем только нужные поля
  //   const foundShopProducts = await this.shopProductModel
  //     .find({
  //       pinnedTo: new Types.ObjectId(authedShop.id),
  //       _id: { $in: shopProductObjectIds }
  //     })
  //     .select('_id shopProductId stockQuantity')
  //     .lean({ virtuals: true })
  //     .exec();
    
  //   // Преобразуем в DTO и возвращаем
  //   return plainToInstance(CurrentShopProductStockResponseDto, foundShopProducts, { excludeExtraneousValues: true });
  // }
}