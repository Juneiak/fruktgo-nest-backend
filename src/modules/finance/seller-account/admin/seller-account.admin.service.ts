import { Injectable } from '@nestjs/common';
import { SellerAccountService } from '../seller-account.service';
import { AuthenticatedUser } from 'src/common/types';
import { 
  WithdrawalRequestFilterQueryDto,
  UpdateWithdrawalRequestDto,
} from './seller-account.admin.request.dtos';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { SellerAccountResponseDto, WithdrawalRequestResponseDto } from './seller-account.admin.response.dtos';
import { plainToInstance } from 'class-transformer';


@Injectable()
export class SellerAccountAdminService {
  constructor(
    private sellerAccountService: SellerAccountService,
  ) {}

  // ====================================================
  // SELLER ACCOUNT
  // ====================================================

  async getSellerAccount(
    authedAdmin: AuthenticatedUser,
    sellerId: string,
  ): Promise<SellerAccountResponseDto> {
    const sellerAccount = await this.sellerAccountService.getSellerAccount(sellerId);
    return plainToInstance(SellerAccountResponseDto, sellerAccount, { excludeExtraneousValues: true });
  }


  // ====================================================
  // WITHDRAWAL REQUEST
  // ====================================================

  async getWithdrawalRequests(
    authedAdmin: AuthenticatedUser,
    filterQuery?: WithdrawalRequestFilterQueryDto,
    paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WithdrawalRequestResponseDto>> {
    const { requests, pagination } = await this.sellerAccountService.getWithdrawalRequests(filterQuery, paginationQuery);
    
    // Преобразуем документы в DTO
    const items = plainToInstance(WithdrawalRequestResponseDto, requests, { excludeExtraneousValues: true });
    return { items, pagination };
  }

  
  async getWithdrawalRequest(
    authedAdmin: AuthenticatedUser,
    withdrawalRequestId: string,
  ): Promise<WithdrawalRequestResponseDto> {
    const withdrawalRequest = await this.sellerAccountService.getWithdrawalRequest(withdrawalRequestId);
    return plainToInstance(WithdrawalRequestResponseDto, withdrawalRequest, { excludeExtraneousValues: true });
  }


  async updateWithdrawalRequest(
    authedAdmin: AuthenticatedUser,
    withdrawalRequestId: string,
    updateWithdrawalRequestDto: UpdateWithdrawalRequestDto,
  ): Promise<WithdrawalRequestResponseDto> {
    const withdrawalRequest = await this.sellerAccountService.updateWithdrawalRequest(withdrawalRequestId, updateWithdrawalRequestDto);
    
    return plainToInstance(WithdrawalRequestResponseDto, withdrawalRequest, { excludeExtraneousValues: true });
  }
}