import { Injectable, ForbiddenException, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UploadsService } from 'src/infra/uploads/uploads.service';
import { PaginationQueryDto } from "src/interface/http/common/common.query.dtos";
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { plainToInstance } from 'class-transformer';
import { UpdateShopProductDto } from './seller.shop-products.request.dtos';
import { SellerModel } from 'src/modules/seller/seller.schema';
import { transformPaginatedResult, checkEntityStatus } from 'src/common/utils';
import { ShopProductModel, ShopProductStatus } from "src/modules/shop-product/shop-product.schema";
import { ShopProductResponseDto } from './seller.shop-product.response.dtos';
import { ProductModel } from 'src/modules/product/product.schema';
import { MessageResponseDto } from 'src/interface/http/common/common.response.dtos';
import {checkId} from 'src/common/utils';
import { LogsService } from 'src/infra/logs/logs.service';
import { LogLevel } from "src/infra/logs/logs.schema";
import { AuthenticatedUser } from 'src/common/types';
import { UserType } from "src/common/enums/common.enum";
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dto';
import { ShopModel } from 'src/modules/shop/shop.schema';
import { ShopProductsQueryDto } from './seller.shop-products.query.dtos';

@Injectable()
export class SellerShopProductsRoleService {
  constructor(
    @InjectModel('Seller') private sellerModel: SellerModel,
    @InjectModel('Shop') private shopModel: ShopModel,
    @InjectModel('ShopProduct') private shopProductModel: ShopProductModel,
    @InjectModel('Product') private productModel: ProductModel,
    private readonly logsService: LogsService,
    private readonly uploadsService: UploadsService
  ) {}


  async getShopProducts(
    authedSeller: AuthenticatedUser, 
    shopProductsQuery: ShopProductsQueryDto,
    paginationQuery: PaginationQueryDto 
  ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
    if (!shopProductsQuery.shopId) throw new BadRequestException('Магазин не указан');
    checkId([shopProductsQuery.shopId]);

    const shopExists = await this.shopModel.exists({
      _id: new Types.ObjectId(shopProductsQuery.shopId),
      owner: new Types.ObjectId(authedSeller.id),
    }).exec();
    if (!shopExists) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');
    
    const { page = 1, pageSize = 10 } = paginationQuery;
    const result = await this.shopProductModel.paginate(
      { pinnedTo: new Types.ObjectId(shopProductsQuery.shopId) },
      { page, limit: pageSize, lean: true, leanWithId: false,
        sort: { createdAt: -1 },
        populate: {
          path: 'product'
        },
      }
    );
    
    return transformPaginatedResult(result, ShopProductResponseDto);
  }


  async getShopProduct(
    authedSeller: AuthenticatedUser,
    shopProductId: string
  ): Promise<ShopProductResponseDto> {
    checkId([shopProductId]);

    const foundShopProduct = await this.shopProductModel.findById(new Types.ObjectId(shopProductId))
    .populate([
        { path: 'product' },
        { path: 'images', select: 'imageId createdAt' },
      ])
    .lean({ virtuals: true }).exec();
    if (!foundShopProduct) throw new NotFoundException('Товар не найден');
    
    const foundShop = await this.shopModel.exists({_id: foundShopProduct.pinnedTo, owner: new Types.ObjectId(authedSeller.id)}).exec();
    if (!foundShop) throw new NotFoundException('Товар не принадлежит данному продавцу');

    return plainToInstance(ShopProductResponseDto, foundShopProduct, { excludeExtraneousValues: true });
  }


  async getShopProductLogs(
    authedSeller: AuthenticatedUser,
    shopProductId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    checkId([shopProductId]);

    const foundShopProduct = await this.shopProductModel.findById(new Types.ObjectId(shopProductId)).exec();
    if (!foundShopProduct) throw new NotFoundException('Товар не найден');

    const foundShop = await this.shopModel.exists({_id: foundShopProduct.pinnedTo, owner: new Types.ObjectId(authedSeller.id)}).exec();
    if (!foundShop) throw new NotFoundException('Товар не принадлежит данному продавцу');

    return this.logsService.getAllShopProductLogs(foundShopProduct._id.toString(), paginationQuery, [UserType.SELLER]);
  }



  async updateShopProduct(
    authedSeller: AuthenticatedUser, 
    dto: UpdateShopProductDto
  ): Promise<ShopProductResponseDto> {
    const isSellerValid = await checkEntityStatus(
      this.sellerModel,
      { _id: new Types.ObjectId(authedSeller.id) },
    );
    if (!isSellerValid) throw new NotFoundException('Продавец не найден или заблокирован или не верифицирован');

    const foundProduct = await this.productModel.findOne({_id: new Types.ObjectId(dto.productId), owner: new Types.ObjectId(authedSeller.id)}).exec();
    if (!foundProduct) throw new NotFoundException('Товар не найден');

    const isShopValid = await checkEntityStatus(
      this.shopModel,
      { _id: new Types.ObjectId(dto.shopId), owner: new Types.ObjectId(authedSeller.id) },
    );
    if (!isShopValid) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу или заблокирован или не верифицирован');

    const foundShopProduct = await this.shopProductModel.findOne({product: new Types.ObjectId(dto.productId), pinnedTo: new Types.ObjectId(dto.shopId)}).exec();

        let shopProductIdToReturn: string;

        if (!foundShopProduct) {
          const newShopProductQuantity = dto.stockQuantity ?? 0;
          let newShopProductStatus: ShopProductStatus;
          if (newShopProductQuantity === 0) newShopProductStatus = ShopProductStatus.OUT_OF_STOCK;
          else if (dto.status && [ShopProductStatus.ACTIVE, ShopProductStatus.PAUSED].includes(dto.status)) newShopProductStatus = dto.status;
          else if (newShopProductQuantity > 0) newShopProductStatus = ShopProductStatus.ACTIVE;
          else newShopProductStatus = ShopProductStatus.PAUSED;

      const newShopProduct = await this.shopProductModel.create({
        product: new Types.ObjectId(dto.productId), 
        pinnedTo: new Types.ObjectId(dto.shopId),
        stockQuantity: newShopProductQuantity,
        status: newShopProductStatus,
      });

          shopProductIdToReturn = newShopProduct._id.toString();

      await this.logsService.addShopProductLog(
        newShopProduct._id.toString(), 
        `Продавец ${authedSeller.id} добавил товар в магазин`,
        { forRoles: [UserType.SELLER], logLevel: LogLevel.MEDIUM },
      );

    } 
    else {
      shopProductIdToReturn = foundShopProduct._id.toString();
        
      const oldData = foundShopProduct.toObject();
      const changes: string[] = [];

      const isStockQuantityChanged = dto.stockQuantity !== undefined && dto.stockQuantity !== foundShopProduct.stockQuantity;
      const isStatusChanged = dto.status !== undefined && dto.status !== foundShopProduct.status;

      if (isStockQuantityChanged) {
        foundShopProduct.stockQuantity = dto.stockQuantity!;
        changes.push(`Количество на складе: ${oldData.stockQuantity} → ${foundShopProduct.stockQuantity}`);
      }
      if (isStockQuantityChanged && dto.stockQuantity === 0) {
        foundShopProduct.status = ShopProductStatus.OUT_OF_STOCK;
        changes.push(`Статус: ${oldData.status} → ${ShopProductStatus.OUT_OF_STOCK}`);
      } 
      else if (isStatusChanged && [ShopProductStatus.ACTIVE, ShopProductStatus.PAUSED].includes(dto.status!)) {
        foundShopProduct.status = dto.status!;
        changes.push(`Статус: ${oldData.status} → ${dto.status!}`);
      }
      
      if (changes.length > 0 && foundShopProduct.isModified()) {
        await foundShopProduct.save();
        await this.logsService.addShopProductLog(
          foundShopProduct._id.toString(), 
          `Продавец ${authedSeller.id} обновил товар:` + changes.join('. '),
          { forRoles: [UserType.SELLER], logLevel: LogLevel.LOW },
        );
      }
    }

    return this.getShopProduct(authedSeller, shopProductIdToReturn);
  }


  async removeShopProduct(
    authedSeller: AuthenticatedUser,
    shopProductId: string 
  ): Promise<MessageResponseDto> {
    const session = await this.shopProductModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        const isSellerValid = await checkEntityStatus(
          this.sellerModel,
          { _id: new Types.ObjectId(authedSeller.id) },
          { session }
        );
        if (!isSellerValid) throw new NotFoundException('Продавец не найден или заблокирован или не верифицирован');

        const foundShopProduct = await this.shopProductModel.findById(new Types.ObjectId(shopProductId)).session(session).exec();
        if (!foundShopProduct) throw new NotFoundException('Товар не найден');

        const isShopValid = await checkEntityStatus(
          this.shopModel,
          { _id: foundShopProduct.pinnedTo, owner: new Types.ObjectId(authedSeller.id) },
          { session }
        );
        if (!isShopValid) throw new NotFoundException('Товар не принадлежит данному продавцу или заблокирован или не верифицирован');

        if (foundShopProduct.images.length > 0) {
          for (const image of foundShopProduct.images) {
            await this.uploadsService.deleteFile(image.toString(), session);
          }
        }

        await this.shopProductModel.findByIdAndDelete(foundShopProduct._id).session(session).exec();

        await this.logsService.addShopLog(
          foundShopProduct.pinnedTo.toString(),
          `Продавец ${authedSeller.id} удалил товар ${foundShopProduct.product.toString()} из магазина`,
          { forRoles: [UserType.SELLER], logLevel: LogLevel.MEDIUM, session }
        );
      });
      return plainToInstance(MessageResponseDto, { message: 'Товар успешно удален из магазина' });

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      console.error('Ошибка при удалении товара из магазина:', error);
      throw new InternalServerErrorException('Ошибка при удалении товара из магазина');
    } finally {
      session.endSession();
    }
  }


  async removeShopProductImage(
    authedSeller: AuthenticatedUser,
    shopProductId: string,
    imageId: string
  ): Promise<ShopProductResponseDto> {
    checkId([shopProductId, imageId]);
    const session = await this.shopModel.db.startSession();

    try {
      const updatedShopProductId = await session.withTransaction(async () => {
        const isSellerValid = await checkEntityStatus(
          this.sellerModel,
          { _id: new Types.ObjectId(authedSeller.id) },
          { session }
        );
        if (!isSellerValid) throw new NotFoundException('Продавец не найден или заблокирован или не верифицирован');

        const foundShopProduct = await this.shopProductModel.findOne({ _id: new Types.ObjectId(shopProductId), owner: new Types.ObjectId(authedSeller.id) }).session(session).exec();
        if (!foundShopProduct) throw new NotFoundException('Товар не найден или не принадлежит данному продавцу');

        // Проверяем наличие магазина и права на него
        const foundShop = await checkEntityStatus(
          this.shopModel,
          { _id: foundShopProduct.pinnedTo, owner: new Types.ObjectId(authedSeller.id) },
          { session }
        )
        if (!foundShop) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');

        const imageIdToDelete = foundShopProduct.images.find(img => img.toString() === imageId);
        if (!imageIdToDelete) throw new NotFoundException('Изображение не найдено в данном продукте');
        
        foundShopProduct.images = foundShopProduct.images.filter(img => img.toString() !== imageIdToDelete.toString());
        if (foundShopProduct.isModified()) {
          await foundShopProduct.save({ session });
          await this.uploadsService.deleteFile(imageIdToDelete.toString(), session);

          await this.logsService.addShopProductLog(
            foundShopProduct._id.toString(),
            `Продавец удалил изображение ${imageIdToDelete.toString()}`,
            { forRoles: [UserType.SELLER], logLevel: LogLevel.MEDIUM, session }
          );
        }
        return foundShopProduct._id.toString();
      });

      // Возвращаем товар
      if (!updatedShopProductId) throw new NotFoundException('Не удалось удалить изображение продукта');
      return this.getShopProduct(authedSeller, updatedShopProductId);
      
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      console.error('Ошибка при удалении изображения продукта:', error);
      throw new InternalServerErrorException('Ошибка при удалении изображения продукта');
    } finally {
      session.endSession();
    }
  }
};
