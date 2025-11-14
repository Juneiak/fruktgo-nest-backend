import { Injectable, NotFoundException, Inject, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ShopPreviewResponseDto,
  ShopFullResponseDto,
} from './admin.shops.response.dtos';
import { UpdateShopDto, BlockShopDto } from './admin.shops.request.dtos';
import { checkId } from "src/common/utils";
import { AuthenticatedUser } from 'src/common/types';
import { UserType } from "src/common/enums/common.enum";
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
import {
  ShopPort,
  SHOP_PORT,
  ShopQueries,
  ShopCommands
} from 'src/modules/shop';
import { LogsQueries, LogsEnums, LOGS_PORT, LogsPort } from 'src/infra/logs';
import { ShopQueryFilterDto } from './admin.shops.query.dtos';
import {
  PaginatedResponseDto,
  LogResponseDto,
  transformPaginatedResult,
  PaginationQueryDto
} from 'src/interface/http/common';


@Injectable()
export class AdminShopsRoleService {
  constructor(
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
  ) { }



  async getShops(
    authedAdmin: AuthenticatedUser,
    shopQueryFilter: ShopQueryFilterDto,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopPreviewResponseDto>> {
    try {
      const query = new ShopQueries.GetShopsQuery({
        city: shopQueryFilter.city,
        sellerId: shopQueryFilter.sellerId,
        statuses: shopQueryFilter.statuses,
      });
      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery
      };
      const result = await this.shopPort.getShops(query, queryOptions);

      return transformPaginatedResult(result, ShopPreviewResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры фильтрации'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getShop(
    authedAdmin: AuthenticatedUser,
    shopId: string
  ): Promise<ShopFullResponseDto> {
    try {
      const query = new ShopQueries.GetShopQuery({ shopId });
      const shop = await this.shopPort.getShop(query);
      
      if (!shop) throw new NotFoundException('Магазин не найден');

      return plainToInstance(ShopFullResponseDto, shop, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Магазин не найден'),
        [DomainErrorCode.BAD_REQUEST]: new BadRequestException('Неверные параметры запроса'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID магазина'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getShopLogs(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    try {
      const query = new LogsQueries.GetEntityLogsQuery(
        LogsEnums.LogEntityType.SHOP,
        shopId,
        [UserType.ADMIN]
      );
      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery
      };
      const result = await this.logsPort.getEntityLogs(query, queryOptions);

      return transformPaginatedResult(result, LogResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID магазина'),
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Магазин не найден'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async updateShop(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    dto: UpdateShopDto
  ): Promise<ShopFullResponseDto> {
    try {
      const command = new ShopCommands.UpdateShopCommand(shopId, {
        verifiedStatus: dto.verifiedStatus,
        internalNote: dto.internalNote,
      });
      await this.shopPort.updateShop(command);

      return this.getShop(authedAdmin, shopId);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Магазин не найден'),
        [DomainErrorCode.CONFLICT]: new ConflictException('Магазин с таким названием уже существует'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID магазина'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных магазина'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async blockShop(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    dto: BlockShopDto
  ): Promise<ShopFullResponseDto> {
    try {
      const command = new ShopCommands.BlockShopCommand(shopId, {
        status: dto.status,
        reason: dto.reason,
        code: dto.code,
        blockedUntil: dto.blockedUntil,
      });
      await this.shopPort.blockShop(command);

      return this.getShop(authedAdmin, shopId);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Магазин не найден'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID магазина'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных блокировки'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }
}