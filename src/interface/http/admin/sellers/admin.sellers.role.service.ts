import { Injectable, NotFoundException, Inject, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  SellerFullResponseDto,
  SellerPreviewResponseDto,
} from './admin.sellers.response.dtos';
import { UpdateSellerByAdminDto, BlockSellerDto } from './admin.sellers.request.dtos';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { UserType } from "src/common/enums/common.enum";
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
import {
  SellerPort,
  SELLER_PORT,
  SellerQueries,
  SellerCommands
} from 'src/modules/seller';
import { LogsQueries, LogsEnums, LOGS_PORT, LogsPort } from 'src/infra/logs';

import {
  PaginatedResponseDto,
  LogResponseDto,
  transformPaginatedResult,
  PaginationQueryDto
} from 'src/interface/http/shared';

@Injectable()
export class AdminSellersRoleService {
  constructor(
    @Inject(SELLER_PORT) private readonly sellerPort: SellerPort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
  ) { }



  async getSellers(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<SellerPreviewResponseDto>> {
    try {
      const query = new SellerQueries.GetSellersQuery();
      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery
      };
      const result = await this.sellerPort.getSellers(query, queryOptions);

      return transformPaginatedResult(result, SellerPreviewResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры фильтрации'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getSeller(
    authedAdmin: AuthenticatedUser,
    sellerId: string
  ): Promise<SellerFullResponseDto> {
    try {
      const query = new SellerQueries.GetSellerQuery({ sellerId });
      const seller = await this.sellerPort.getSeller(query);

      if (!seller) throw new NotFoundException('Продавец не найден');

      return plainToInstance(SellerFullResponseDto, seller, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Продавец не найден'),
        [DomainErrorCode.BAD_REQUEST]: new BadRequestException('Неверные параметры запроса'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID продавца'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getSellerLogs(
    authedAdmin: AuthenticatedUser,
    sellerId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    try {
      const query = new LogsQueries.GetEntityLogsQuery(
        LogsEnums.LogEntityType.SELLER,
        sellerId,
        [UserType.ADMIN]
      );
      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery
      };
      const result = await this.logsPort.getEntityLogs(query, queryOptions);

      return transformPaginatedResult(result, LogResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID продавца'),
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Продавец не найден'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async updateSeller(
    authedAdmin: AuthenticatedUser,
    sellerId: string,
    dto: UpdateSellerByAdminDto
  ): Promise<SellerFullResponseDto> {
    try {
      const command = new SellerCommands.UpdateSellerCommand(sellerId, {
        verifiedStatus: dto.verifiedStatus,
        internalNote: dto.internalNote,
      });
      await this.sellerPort.updateSeller(command);

      return this.getSeller(authedAdmin, sellerId);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Продавец не найден'),
        [DomainErrorCode.VALIDATION]: new BadRequestException('Неверный формат данных'),
        [DomainErrorCode.CONFLICT]: new ConflictException('Продавец с такими данными уже существует'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID продавца'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных продавца'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async blockSeller(
    authedAdmin: AuthenticatedUser,
    sellerId: string,
    dto: BlockSellerDto
  ): Promise<SellerFullResponseDto> {
    try {
      const command = new SellerCommands.BlockSellerCommand(sellerId, {
        status: dto.status,
        reason: dto.reason,
        code: dto.code,
        blockedUntil: dto.blockedUntil,
      });
      await this.sellerPort.blockSeller(command);

      return this.getSeller(authedAdmin, sellerId);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Продавец не найден'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID продавца'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных блокировки'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }
}