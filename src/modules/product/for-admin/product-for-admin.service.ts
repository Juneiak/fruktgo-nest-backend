import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { plainToInstance } from "class-transformer";
import {
  ProductForAdminPreviewResponseDto,
  ProductForAdminFullResponseDto,
} from "./product-for-admin.dtos";
import { checkId } from "src/common/utils";
import { Product } from "../product.schema";
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationMetaDto, PaginationQueryDto } from "src/common/dtos";
import { LogsService } from 'src/common/modules/logs/logs.service';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';


@Injectable()
export class ProductForAdminService {
  constructor(
    @InjectModel('Product') private productModel: Model<Product>,
    private logsService: LogsService,
  ) {}


  async getAllSellerProducts(
    authedAdmin: AuthenticatedUser, 
    sellerId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProductForAdminPreviewResponseDto>> {
    checkId([sellerId]);
    
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество продуктов данного продавца для пагинации
    const totalItems = await this.productModel.countDocuments({ owner: new Types.ObjectId(sellerId) }).exec();
    
    // Получаем продукты с пагинацией
    const products = await this.productModel.find({ owner: new Types.ObjectId(sellerId) })
      .sort({ createdAt: -1 }) // Сортировка по дате создания (от новых к старым)
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    // Формируем метаданные пагинации
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    // Преобразуем модели в DTO
    const items = plainToInstance(
      ProductForAdminPreviewResponseDto, 
      products, 
      { excludeExtraneousValues: true }
    );
    
    return { items, pagination };
  }


  async getSellerProduct(authedAdmin: AuthenticatedUser, productId: string): Promise<ProductForAdminFullResponseDto> {
    checkId([productId]);
    const foundProduct = await this.productModel.findOne({ _id: new Types.ObjectId(productId)})
    .populate({
      path: 'shopProducts',
      select: 'shopProductId pinnedTo stockQuantity status last7daysSales last7daysWriteOff', 
      populate: { path: 'pinnedTo', select: 'shopId shopImage shopName' }
    })
    .lean({ virtuals: true })
    .exec();
    if (!foundProduct) throw new NotFoundException('Продукт не найден');
    return plainToInstance(ProductForAdminFullResponseDto, foundProduct, { excludeExtraneousValues: true });
  }

  async getProductLogs(authedAdmin: AuthenticatedUser, productId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([productId]);
    return await this.logsService.getAllProductLogs(productId, paginationQuery);
  }
}