import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  SellerFullResponseDto,
  SellerPreviewResponseDto,
} from './admin.sellers.response.dtos';
import { UpdateSellerByAdminDto, BlockSellerDto } from './admin.sellers.request.dtos';
import { checkId, transformPaginatedResult } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { UserType } from "src/common/enums/common.enum";
import { PaginatedResponseDto, LogResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { CommonListQueryOptions } from 'src/common/types/queries';
import {
  SellerPort,
  SELLER_PORT,
  SellerQueries,
  SellerCommands
} from 'src/modules/seller';
import { LogsQueries, LogsEnums, LOGS_PORT, LogsPort } from 'src/infra/logs';

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
    const query = new SellerQueries.GetSellersQuery();

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.sellerPort.getSellers(query, queryOptions);
    return transformPaginatedResult(result, SellerPreviewResponseDto);
  }


  async getSeller(
    authedAdmin: AuthenticatedUser,
    sellerId: string
  ): Promise<SellerFullResponseDto> {
    checkId([sellerId]);

    const query = new SellerQueries.GetSellerQuery({ sellerId });
    const seller = await this.sellerPort.getSeller(query);
    
    if (!seller) throw new NotFoundException('Продавец не найден');

    return plainToInstance(SellerFullResponseDto, seller, { excludeExtraneousValues: true });
  }


  async getSellerLogs(
    authedAdmin: AuthenticatedUser,
    sellerId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    checkId([sellerId]);

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
  }


  async updateSeller(
    authedAdmin: AuthenticatedUser,
    sellerId: string,
    dto: UpdateSellerByAdminDto
  ): Promise<SellerFullResponseDto> {
    checkId([sellerId]);

    const command = new SellerCommands.UpdateSellerCommand(sellerId, {
      verifiedStatus: dto.verifiedStatus,
      internalNote: dto.internalNote,
    });

    await this.sellerPort.updateSeller(command);
    return this.getSeller(authedAdmin, sellerId);
  }


  async blockSeller(
    authedAdmin: AuthenticatedUser,
    sellerId: string,
    dto: BlockSellerDto
  ): Promise<SellerFullResponseDto> {
    checkId([sellerId]);

    const command = new SellerCommands.BlockSellerCommand(sellerId, {
      status: dto.status,
      reason: dto.reason,
      code: dto.code,
      blockedUntil: dto.blockedUntil,
    });

    await this.sellerPort.blockSeller(command);
    return this.getSeller(authedAdmin, sellerId);
  }
}