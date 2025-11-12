import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import {
  CreateProductDto,
  UpdateProductDto,
} from "./seller.products.request.dtos";
import { ProductPreviewResponseDto, ProductFullResponseDto, ProductOfShopResponseDto } from "./seller.products.response.dtos";
import { checkId, transformPaginatedResult } from "src/common/utils";
import { CommonListQueryOptions } from 'src/common/types/queries';
import { UserType } from "src/common/enums/common.enum";
import { PaginatedResponseDto, MessageResponseDto, LogResponseDto } from "src/interface/http/common/common.response.dtos";
import { PaginationQueryDto } from "src/interface/http/common/common.query.dtos";
import { AuthenticatedUser } from 'src/common/types';
import {
  ProductPort,
  PRODUCT_PORT,
  ProductQueries,
  ProductCommands
} from 'src/modules/product';
import { LogsQueries, LogsEnums, LOGS_PORT, LogsPort } from 'src/infra/logs';

@Injectable()
export class SellerProductsRoleService {
  constructor(
    @Inject(PRODUCT_PORT) private readonly productPort: ProductPort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
  ) { }

  async getProducts(
    authedSeller: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProductPreviewResponseDto>> {
    const query = new ProductQueries.GetProductsQuery({
      sellerId: authedSeller.id,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.productPort.getProducts(query, queryOptions);
    return transformPaginatedResult(result, ProductPreviewResponseDto);
  }

  async getProduct(
    authedSeller: AuthenticatedUser,
    productId: string
  ): Promise<ProductFullResponseDto> {
    checkId([productId]);

    const product = await this.productPort.getProduct(productId);
    if (!product) throw new NotFoundException('Продукт не найден');

    // Проверка что продукт принадлежит продавцу
    if (product.owner.toString() !== authedSeller.id) {
      throw new NotFoundException('Продукт не найден');
    }

    return plainToInstance(ProductFullResponseDto, product, { excludeExtraneousValues: true });
  }


  async getSellerProductLogs(
    authedSeller: AuthenticatedUser,
    productId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    checkId([productId]);

    // Проверяем что продукт принадлежит продавцу
    const product = await this.productPort.getProduct(productId);
    if (!product) throw new NotFoundException('Продукт не найден');
    
    if (product.owner.toString() !== authedSeller.id) {
      throw new NotFoundException('Продукт не найден');
    }

    const query = new LogsQueries.GetEntityLogsQuery(
      LogsEnums.LogEntityType.PRODUCT,
      productId,
      [UserType.SELLER]
    );
    
    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };
    
    const result = await this.logsPort.getEntityLogs(query, queryOptions);
    return transformPaginatedResult(result, LogResponseDto);
  }


  async createProduct(
    authedSeller: AuthenticatedUser,
    dto: CreateProductDto,
    cardImage?: Express.Multer.File
  ): Promise<ProductPreviewResponseDto> {
    const command = new ProductCommands.CreateProductCommand({
      sellerId: authedSeller.id,
      productName: dto.productName,
      category: dto.category,
      price: dto.price,
      measuringScale: dto.measuringScale,
      stepRate: dto.stepRate,
      aboutProduct: dto.aboutProduct,
      origin: dto.origin,
      productArticle: dto.productArticle,
      cardImageFile: cardImage
    });

    const product = await this.productPort.createProduct(command);
    return plainToInstance(ProductPreviewResponseDto, product, { excludeExtraneousValues: true });
  }


  async updateProduct(
    authedSeller: AuthenticatedUser,
    productId: string,
    dto: UpdateProductDto,
    cardImage?: Express.Multer.File
  ): Promise<ProductFullResponseDto> {
    checkId([productId]);

    // Проверка владения продуктом
    const existingProduct = await this.productPort.getProduct(productId);
    if (!existingProduct) throw new NotFoundException('Продукт не найден');
    
    if (existingProduct.owner.toString() !== authedSeller.id) {
      throw new NotFoundException('Продукт не найден');
    }

    const command = new ProductCommands.UpdateProductCommand(productId, {
      productName: dto.productName,
      price: dto.price,
      stepRate: dto.stepRate,
      aboutProduct: dto.aboutProduct,
      origin: dto.origin,
      productArticle: dto.productArticle,
      cardImageFile: cardImage
    });

    const product = await this.productPort.updateProduct(command);
    return plainToInstance(ProductFullResponseDto, product, { excludeExtraneousValues: true });
  }


  async deleteProduct(
    authedSeller: AuthenticatedUser,
    productId: string
  ): Promise<MessageResponseDto> {
    checkId([productId]);

    // Проверка владения продуктом
    const existingProduct = await this.productPort.getProduct(productId);
    if (!existingProduct) throw new NotFoundException('Продукт не найден');
    
    if (existingProduct.owner.toString() !== authedSeller.id) {
      throw new NotFoundException('Продукт не найден');
    }

    await this.productPort.deleteProduct(productId);
    return plainToInstance(MessageResponseDto, { message: 'Продукт успешно удален' });
  }


  // TODO: Требует доработки в ProductPort для поддержки populate shopProducts
  // Метод должен возвращать продукты продавца с информацией о привязках к магазинам
  async getProductsOfShop(
    authedSeller: AuthenticatedUser,
    shopId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ProductOfShopResponseDto>> {
    checkId([shopId]);
    
    // Временная заглушка - возвращаем все продукты без shopProducts
    const query = new ProductQueries.GetProductsQuery({
      sellerId: authedSeller.id,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.productPort.getProducts(query, queryOptions);
    return transformPaginatedResult(result, ProductOfShopResponseDto);
  }
}