import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto } from "src/interface/http/common/common.query.dtos";
import { PaginatedResponseDto, MessageResponseDto } from 'src/interface/http/common/common.response.dtos';
import { UpdateShopProductDto } from './seller.shop-products.request.dtos';
import { transformPaginatedResult, checkId } from 'src/common/utils';
import { ShopProductResponseDto } from './seller.shop-products.response.dtos';
import { AuthenticatedUser } from 'src/common/types';
import { ShopProductsQueryDto } from './seller.shop-products.query.dtos';
import { CommonListQueryOptions } from 'src/common/types/queries';
import {
  ShopProductPort,
  SHOP_PRODUCT_PORT,
  ShopProductQueries,
} from 'src/modules/shop-product';
import { ShopPort, SHOP_PORT, ShopQueries } from 'src/modules/shop';
import { LogsPort, LOGS_PORT } from 'src/infra/logs';

@Injectable()
export class SellerShopProductsRoleService {
  constructor(
    @Inject(SHOP_PRODUCT_PORT) private readonly shopProductPort: ShopProductPort,
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
  ) {}

  async getShopProducts(
    authedSeller: AuthenticatedUser,
    shopProductsQuery: ShopProductsQueryDto,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
    if (!shopProductsQuery.shopId) throw new BadRequestException('Магазин не указан');
    checkId([shopProductsQuery.shopId]);

    // Проверяем что магазин принадлежит продавцу
    const shop = await this.shopPort.getShop(new ShopQueries.GetShopQuery({ shopId: shopProductsQuery.shopId }));
    
    if (!shop) throw new NotFoundException('Магазин не найден');
    if (shop.owner.toString() !== authedSeller.id) {
      throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');
    }

    const query = new ShopProductQueries.GetShopProductsQuery({
      shopId: shopProductsQuery.shopId,
    }, {
      populateProduct: true,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.shopProductPort.getShopProducts(query, queryOptions);
    return transformPaginatedResult(result, ShopProductResponseDto);
  }


  async getShopProduct(
    authedSeller: AuthenticatedUser,
    shopProductId: string
  ): Promise<ShopProductResponseDto> {
    checkId([shopProductId]);

    const query = new ShopProductQueries.GetShopProductQuery(shopProductId, {
      populateProduct: true,
      populateImages: true,
    });

    const shopProduct = await this.shopProductPort.getShopProduct(query);
    if (!shopProduct) throw new NotFoundException('Товар не найден');

    // Проверяем что магазин принадлежит продавцу
    const shop = await this.shopPort.getShop(new ShopQueries.GetShopQuery({ shopId: shopProduct.pinnedTo.toString() }));
    
    if (!shop || shop.owner.toString() !== authedSeller.id) {
      throw new NotFoundException('Товар не найден');
    }

    return plainToInstance(ShopProductResponseDto, shopProduct, { excludeExtraneousValues: true });
  }

  // async getShopProducts(
  //   authedSeller: AuthenticatedUser, 
  //   shopProductsQuery: ShopProductsQueryDto,
  //   paginationQuery: PaginationQueryDto 
  // ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
  //   if (!shopProductsQuery.shopId) throw new BadRequestException('Магазин не указан');
  //   checkId([shopProductsQuery.shopId]);

  //   const shopExists = await this.shopModel.exists({
  //     _id: new Types.ObjectId(shopProductsQuery.shopId),
  //     owner: new Types.ObjectId(authedSeller.id),
  //   }).exec();
  //   if (!shopExists) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');
    
  //   const { page = 1, pageSize = 10 } = paginationQuery;
  //   const result = await this.shopProductModel.paginate(
  //     { pinnedTo: new Types.ObjectId(shopProductsQuery.shopId) },
  //     { page, limit: pageSize, lean: true, leanWithId: false,
  //       sort: { createdAt: -1 },
  //       populate: {
  //         path: 'product'
  //       },
  //     }
  //   );
    
  //   return transformPaginatedResult(result, ShopProductResponseDto);
  // }


  // async getShopProduct(
  //   authedSeller: AuthenticatedUser,
  //   shopProductId: string
  // ): Promise<ShopProductResponseDto> {
  //   checkId([shopProductId]);

  //   const foundShopProduct = await this.shopProductModel.findById(new Types.ObjectId(shopProductId))
  //   .populate([
  //       { path: 'product' },
  //       { path: 'images', select: 'imageId createdAt' },
  //     ])
  //   .lean({ virtuals: true }).exec();
  //   if (!foundShopProduct) throw new NotFoundException('Товар не найден');
    
  //   const foundShop = await this.shopModel.exists({_id: foundShopProduct.pinnedTo, owner: new Types.ObjectId(authedSeller.id)}).exec();
  //   if (!foundShop) throw new NotFoundException('Товар не принадлежит данному продавцу');

  //   return plainToInstance(ShopProductResponseDto, foundShopProduct, { excludeExtraneousValues: true });
  // }


  // async getShopProductLogs(
  //   authedSeller: AuthenticatedUser,
  //   shopProductId: string,
  //   paginationQuery: PaginationQueryDto
  // ): Promise<PaginatedLogDto> {
  //   checkId([shopProductId]);

  //   const foundShopProduct = await this.shopProductModel.findById(new Types.ObjectId(shopProductId)).exec();
  //   if (!foundShopProduct) throw new NotFoundException('Товар не найден');

  //   const foundShop = await this.shopModel.exists({_id: foundShopProduct.pinnedTo, owner: new Types.ObjectId(authedSeller.id)}).exec();
  //   if (!foundShop) throw new NotFoundException('Товар не принадлежит данному продавцу');

  //   return this.logsService.getAllShopProductLogs(foundShopProduct._id.toString(), paginationQuery, [UserType.SELLER]);
  // }



  // async updateShopProduct(
  //   authedSeller: AuthenticatedUser, 
  //   dto: UpdateShopProductDto
  // ): Promise<ShopProductResponseDto> {
  //   const isSellerValid = await checkEntityStatus(
  //     this.sellerModel,
  //     { _id: new Types.ObjectId(authedSeller.id) },
  //   );
  //   if (!isSellerValid) throw new NotFoundException('Продавец не найден или заблокирован или не верифицирован');

  //   const foundProduct = await this.productModel.findOne({_id: new Types.ObjectId(dto.productId), owner: new Types.ObjectId(authedSeller.id)}).exec();
  //   if (!foundProduct) throw new NotFoundException('Товар не найден');

  //   const isShopValid = await checkEntityStatus(
  //     this.shopModel,
  //     { _id: new Types.ObjectId(dto.shopId), owner: new Types.ObjectId(authedSeller.id) },
  //   );
  //   if (!isShopValid) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу или заблокирован или не верифицирован');

  //   const foundShopProduct = await this.shopProductModel.findOne({product: new Types.ObjectId(dto.productId), pinnedTo: new Types.ObjectId(dto.shopId)}).exec();

  //       let shopProductIdToReturn: string;

  //       if (!foundShopProduct) {
  //         const newShopProductQuantity = dto.stockQuantity ?? 0;
  //         let newShopProductStatus: ShopProductStatus;
  //         if (newShopProductQuantity === 0) newShopProductStatus = ShopProductStatus.OUT_OF_STOCK;
  //         else if (dto.status && [ShopProductStatus.ACTIVE, ShopProductStatus.PAUSED].includes(dto.status)) newShopProductStatus = dto.status;
  //         else if (newShopProductQuantity > 0) newShopProductStatus = ShopProductStatus.ACTIVE;
  //         else newShopProductStatus = ShopProductStatus.PAUSED;

  //     const newShopProduct = await this.shopProductModel.create({
  //       product: new Types.ObjectId(dto.productId), 
  //       pinnedTo: new Types.ObjectId(dto.shopId),
  //       stockQuantity: newShopProductQuantity,
  //       status: newShopProductStatus,
  //     });

  //         shopProductIdToReturn = newShopProduct._id.toString();

  //     await this.logsService.addShopProductLog(
  //       newShopProduct._id.toString(), 
  //       `Продавец ${authedSeller.id} добавил товар в магазин`,
  //       { forRoles: [UserType.SELLER], logLevel: LogLevel.MEDIUM },
  //     );

  //   } 
  //   else {
  //     shopProductIdToReturn = foundShopProduct._id.toString();
        
  //     const oldData = foundShopProduct.toObject();
  //     const changes: string[] = [];

  //     const isStockQuantityChanged = dto.stockQuantity !== undefined && dto.stockQuantity !== foundShopProduct.stockQuantity;
  //     const isStatusChanged = dto.status !== undefined && dto.status !== foundShopProduct.status;

  //     if (isStockQuantityChanged) {
  //       foundShopProduct.stockQuantity = dto.stockQuantity!;
  //       changes.push(`Количество на складе: ${oldData.stockQuantity} → ${foundShopProduct.stockQuantity}`);
  //     }
  //     if (isStockQuantityChanged && dto.stockQuantity === 0) {
  //       foundShopProduct.status = ShopProductStatus.OUT_OF_STOCK;
  //       changes.push(`Статус: ${oldData.status} → ${ShopProductStatus.OUT_OF_STOCK}`);
  //     } 
  //     else if (isStatusChanged && [ShopProductStatus.ACTIVE, ShopProductStatus.PAUSED].includes(dto.status!)) {
  //       foundShopProduct.status = dto.status!;
  //       changes.push(`Статус: ${oldData.status} → ${dto.status!}`);
  //     }
      
  //     if (changes.length > 0 && foundShopProduct.isModified()) {
  //       await foundShopProduct.save();
  //       await this.logsService.addShopProductLog(
  //         foundShopProduct._id.toString(), 
  //         `Продавец ${authedSeller.id} обновил товар:` + changes.join('. '),
  //         { forRoles: [UserType.SELLER], logLevel: LogLevel.LOW },
  //       );
  //     }
  //   }

  //   return this.getShopProduct(authedSeller, shopProductIdToReturn);
  // }


  // async removeShopProduct(
  //   authedSeller: AuthenticatedUser,
  //   shopProductId: string 
  // ): Promise<MessageResponseDto> {
  //   const session = await this.shopProductModel.db.startSession();
  //   try {
  //     await session.withTransaction(async () => {
  //       const isSellerValid = await checkEntityStatus(
  //         this.sellerModel,
  //         { _id: new Types.ObjectId(authedSeller.id) },
  //         { session }
  //       );
  //       if (!isSellerValid) throw new NotFoundException('Продавец не найден или заблокирован или не верифицирован');

  //       const foundShopProduct = await this.shopProductModel.findById(new Types.ObjectId(shopProductId)).session(session).exec();
  //       if (!foundShopProduct) throw new NotFoundException('Товар не найден');

  //       const isShopValid = await checkEntityStatus(
  //         this.shopModel,
  //         { _id: foundShopProduct.pinnedTo, owner: new Types.ObjectId(authedSeller.id) },
  //         { session }
  //       );
  //       if (!isShopValid) throw new NotFoundException('Товар не принадлежит данному продавцу или заблокирован или не верифицирован');

  //       if (foundShopProduct.images.length > 0) {
  //         for (const image of foundShopProduct.images) {
  //           await this.uploadsService.deleteFile(image.toString(), session);
  //         }
  //       }

  //       await this.shopProductModel.findByIdAndDelete(foundShopProduct._id).session(session).exec();

  //       await this.logsService.addShopLog(
  //         foundShopProduct.pinnedTo.toString(),
  //         `Продавец ${authedSeller.id} удалил товар ${foundShopProduct.product.toString()} из магазина`,
  //         { forRoles: [UserType.SELLER], logLevel: LogLevel.MEDIUM, session }
  //       );
  //     });
  //     return plainToInstance(MessageResponseDto, { message: 'Товар успешно удален из магазина' });

  //   } catch (error) {
  //     if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
  //     console.error('Ошибка при удалении товара из магазина:', error);
  //     throw new InternalServerErrorException('Ошибка при удалении товара из магазина');
  //   } finally {
  //     session.endSession();
  //   }
  // }


  // async removeShopProductImage(
  //   authedSeller: AuthenticatedUser,
  //   shopProductId: string,
  //   imageId: string
  // ): Promise<ShopProductResponseDto> {
  //   checkId([shopProductId, imageId]);
  //   const session = await this.shopModel.db.startSession();

  //   try {
  //     const updatedShopProductId = await session.withTransaction(async () => {
  //       const isSellerValid = await checkEntityStatus(
  //         this.sellerModel,
  //         { _id: new Types.ObjectId(authedSeller.id) },
  //         { session }
  //       );
  //       if (!isSellerValid) throw new NotFoundException('Продавец не найден или заблокирован или не верифицирован');

  //       const foundShopProduct = await this.shopProductModel.findOne({ _id: new Types.ObjectId(shopProductId), owner: new Types.ObjectId(authedSeller.id) }).session(session).exec();
  //       if (!foundShopProduct) throw new NotFoundException('Товар не найден или не принадлежит данному продавцу');

  //       // Проверяем наличие магазина и права на него
  //       const foundShop = await checkEntityStatus(
  //         this.shopModel,
  //         { _id: foundShopProduct.pinnedTo, owner: new Types.ObjectId(authedSeller.id) },
  //         { session }
  //       )
  //       if (!foundShop) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');

  //       const imageIdToDelete = foundShopProduct.images.find(img => img.toString() === imageId);
  //       if (!imageIdToDelete) throw new NotFoundException('Изображение не найдено в данном продукте');
        
  //       foundShopProduct.images = foundShopProduct.images.filter(img => img.toString() !== imageIdToDelete.toString());
  //       if (foundShopProduct.isModified()) {
  //         await foundShopProduct.save({ session });
  //         await this.uploadsService.deleteFile(imageIdToDelete.toString(), session);

  //         await this.logsService.addShopProductLog(
  //           foundShopProduct._id.toString(),
  //           `Продавец удалил изображение ${imageIdToDelete.toString()}`,
  //           { forRoles: [UserType.SELLER], logLevel: LogLevel.MEDIUM, session }
  //         );
  //       }
  //       return foundShopProduct._id.toString();
  //     });

  //     // Возвращаем товар
  //     if (!updatedShopProductId) throw new NotFoundException('Не удалось удалить изображение продукта');
  //     return this.getShopProduct(authedSeller, updatedShopProductId);
      
  //   } catch (error) {
  //     if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
  //     console.error('Ошибка при удалении изображения продукта:', error);
  //     throw new InternalServerErrorException('Ошибка при удалении изображения продукта');
  //   } finally {
  //     session.endSession();
  //   }
  // }
};
