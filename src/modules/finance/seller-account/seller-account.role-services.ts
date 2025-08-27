import { ForbiddenException, Injectable, MethodNotAllowedException, NotAcceptableException, NotFoundException } from '@nestjs/common';
import { SellerAccountService } from './seller-account.service';
import { AuthenticatedUser } from 'src/common/types';
import { 
  CreateWithdrawalRequestDto, 
  WithdrawalRequestFilterQueryDto,
  UpdateBankDetailsDto,
  UpdateWithdrawalRequestDto,
} from './seller-account.request.dtos';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { SellerAccountResponseDto, WithdrawalRequestResponseDto } from './seller-account.response.dtos';
import { plainToInstance } from 'class-transformer';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SellerAccount } from './schemas/seller-account.schema';
import { checkId } from 'src/common/utils';

@Injectable()
export class SellerAccountServiceForSeller {
  constructor(
    @InjectModel('SellerAccount') private sellerAccountModel: Model<SellerAccount>,
    private sellerAccountService: SellerAccountService,
  ) {}

  async getSellerAccount(authedSeller: AuthenticatedUser): Promise<SellerAccountResponseDto> {
    const sellerAccount = await this.sellerAccountService.getSellerAccount(authedSeller.id);

    return plainToInstance(
      SellerAccountResponseDto,
      sellerAccount,
      { groups: ['seller'], excludeExtraneousValues: true }
    );
  }


  async getWithdrawalRequests(
    authedSeller: AuthenticatedUser,
    filterQuery?: WithdrawalRequestFilterQueryDto,
    paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WithdrawalRequestResponseDto>> {
    const filterQueryForSeller = {
      ...filterQuery,
      ofSellerId: authedSeller.id,
    };
    const { requests, pagination } = await this.sellerAccountService.getWithdrawalRequests(filterQueryForSeller, paginationQuery);
    
    // Преобразуем документы в DTO
    const items = plainToInstance(
      WithdrawalRequestResponseDto,
      requests,
      { groups: ['seller'], excludeExtraneousValues: true }
    );
    return { items, pagination };
  }


  async createWithdrawalRequest(
    authedSeller: AuthenticatedUser,
    createWithdrawalRequestDto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalRequestResponseDto> {
    
    const withdrawalRequest = await this.sellerAccountService.createWithdrawalRequest(authedSeller.id, createWithdrawalRequestDto);
    return plainToInstance(
      WithdrawalRequestResponseDto,
      withdrawalRequest,
      { groups: ['seller'], excludeExtraneousValues: true }
    );
  }


  async getWithdrawalRequest(
    authedSeller: AuthenticatedUser,
    withdrawalRequestId: string,
  ): Promise<WithdrawalRequestResponseDto> {
    const sellerAccount = await this.sellerAccountModel.findOne({seller: new Types.ObjectId(authedSeller.id)}).select('_id').lean({ virtuals: true }).exec();
    if (!sellerAccount) throw new NotFoundException('Аккаунт продавца не найден');
    const withdrawalRequest = await this.sellerAccountService.getWithdrawalRequest(withdrawalRequestId);

    if (withdrawalRequest.sellerAccount.toString() !== sellerAccount._id.toString()) throw new ForbiddenException('нет доступа к заявке');
    
    return plainToInstance(
      WithdrawalRequestResponseDto,
      withdrawalRequest,
      { groups: ['seller'], excludeExtraneousValues: true }
    );
  }


  async updateBankDetails(
    authedSeller: AuthenticatedUser,
    updateBankDetailsDto: UpdateBankDetailsDto,
  ): Promise<SellerAccountResponseDto> {
    const sellerAccount = await this.sellerAccountModel.findOne({seller: new Types.ObjectId(authedSeller.id)}).select('_id').lean({ virtuals: true }).exec();
    if (!sellerAccount) throw new NotFoundException('Аккаунт продавца не найден');

    const updatedSellerAccount = await this.sellerAccountService.updateBankDetails(sellerAccount._id.toString(), updateBankDetailsDto);

    return plainToInstance(
      SellerAccountResponseDto,
      updatedSellerAccount,
      { groups: ['seller'], excludeExtraneousValues: true }
    );
  }
}



@Injectable()
export class SellerAccountServiceForAdmin {
  constructor(
    private sellerAccountService: SellerAccountService,
  ) {}

  async getSellerAccount(
    authedAdmin: AuthenticatedUser,
    sellerId: string,
  ): Promise<SellerAccountResponseDto> {
    const sellerAccount = await this.sellerAccountService.getSellerAccount(sellerId);
    return plainToInstance(
      SellerAccountResponseDto,
      sellerAccount,
      { groups: ['admin'], excludeExtraneousValues: true }
    );
  }

  async getWithdrawalRequests(
    authedAdmin: AuthenticatedUser,
    filterQuery?: WithdrawalRequestFilterQueryDto,
    paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WithdrawalRequestResponseDto>> {
    const { requests, pagination } = await this.sellerAccountService.getWithdrawalRequests(filterQuery, paginationQuery);
    
    // Преобразуем документы в DTO
    const items = plainToInstance(
      WithdrawalRequestResponseDto,
      requests,
      { groups: ['admin'], excludeExtraneousValues: true }
    );
    return { items, pagination };
  }

  async getWithdrawalRequest(
    authedAdmin: AuthenticatedUser,
    withdrawalRequestId: string,
  ): Promise<WithdrawalRequestResponseDto> {
    const withdrawalRequest = await this.sellerAccountService.getWithdrawalRequest(withdrawalRequestId);
    return plainToInstance(
      WithdrawalRequestResponseDto,
      withdrawalRequest,
      { groups: ['admin'], excludeExtraneousValues: true }
    );
  }

  async updateWithdrawalRequest(
    authedAdmin: AuthenticatedUser,
    withdrawalRequestId: string,
    updateWithdrawalRequestDto: UpdateWithdrawalRequestDto,
  ): Promise<WithdrawalRequestResponseDto> {
    const withdrawalRequest = await this.sellerAccountService.updateWithdrawalRequest(withdrawalRequestId, updateWithdrawalRequestDto);
    
    return plainToInstance(
      WithdrawalRequestResponseDto,
      withdrawalRequest,
      { groups: ['admin'], excludeExtraneousValues: true }
    );
  }
}