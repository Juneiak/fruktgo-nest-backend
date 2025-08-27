import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformAccountService } from './platform-account.service';
import { AuthenticatedUser } from 'src/common/types';
import { PlatformAccountResponseDto } from './platform-account.response.dtos';
import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { PlatformAccountTransactionResponseDto } from './platform-account.response.dtos';
import { CreateCorrectionDto } from './platform-account.request.dtos';
import { BadRequestException } from '@nestjs/common';
import { PlatformAccountTransactionType, PlatformAccountTransactionDirection } from './schemas/platform-account-transaction.schema';

@Injectable()
export class PlatformAccountServiceForAdmin {
  constructor(
    private platformAccountService: PlatformAccountService,
  ) {}

  // ====================================================
  // PLATFORM ACCOUNT
  // ====================================================

  async getPlatformAccount(authedAdmin: AuthenticatedUser): Promise<PlatformAccountResponseDto> {
    const platformAccount = await this.platformAccountService.getPlatformAccount();
    return plainToInstance(PlatformAccountResponseDto, platformAccount, { groups: ['admin'], excludeExtraneousValues: true });
  }
  


  // ====================================================
  // PLATFORM ACCOUNT TRANSACTION
  // ====================================================
  async getPlatformAccountTransactions(authedAdmin: AuthenticatedUser, paginationQuery?: PaginationQueryDto): Promise<PaginatedResponseDto<PlatformAccountTransactionResponseDto>> {
    const { transactions, pagination } = await this.platformAccountService.getPlatformAccountTransactions(paginationQuery);
    const items = plainToInstance(PlatformAccountTransactionResponseDto, transactions, { groups: ['admin'], excludeExtraneousValues: true });
    return { items, pagination };
  }


  async getPlatformAccountTransaction(authedAdmin: AuthenticatedUser, platformAccountTransactionId: string): Promise<PlatformAccountTransactionResponseDto> {
    const platformAccountTransaction = await this.platformAccountService.getPlatformAccountTransaction(platformAccountTransactionId);
    return plainToInstance(PlatformAccountTransactionResponseDto, platformAccountTransaction, { groups: ['admin'], excludeExtraneousValues: true });
  }


  async createCorrection(
    authedAdmin: AuthenticatedUser, 
    correctionDto: CreateCorrectionDto
  ): Promise<PlatformAccountTransactionResponseDto> {
    if (![PlatformAccountTransactionType.CORRECTION_IN, PlatformAccountTransactionType.CORRECTION_OUT].includes(correctionDto.type)) throw new BadRequestException('Неверный тип корректировки');

    if (correctionDto.referencePlatformAccountTransactionId) {
      // провкрка на существование транзакции платформенного счета
      await this.platformAccountService.getPlatformAccountTransaction(correctionDto.referencePlatformAccountTransactionId);
    }
    const savedTransaction = await this.platformAccountService.createPlatformAccountTransaction({
      type: correctionDto.type,
      amount: correctionDto.amount,
      direction: correctionDto.type === PlatformAccountTransactionType.CORRECTION_IN ? PlatformAccountTransactionDirection.CREDIT : PlatformAccountTransactionDirection.DEBIT,
      description: correctionDto.description,
      internalComment: correctionDto.internalComment,
      isManual: true,
      referenceOrderId: correctionDto.referenceOrderId,
      referenceCustomerId: correctionDto.referenceCustomerId,
      referenceEmployeeId: correctionDto.referenceEmployeeId,
      referenceSellerAccountId: correctionDto.referenceSellerAccountId,
      referenceShopAccountId: correctionDto.referenceShopAccountId,
      referencePaymentId: correctionDto.referencePaymentId,
      referenceRefundId: correctionDto.referenceRefundId,
      referencePenaltyId: correctionDto.referencePenaltyId,
      referenceWithdrawalRequestId: correctionDto.referenceWithdrawalRequestId,
      referenceDeliveryPaymentId: correctionDto.referenceDeliveryPaymentId,
      referenceExternalServiceId: correctionDto.referenceExternalServiceId,
      referencePlatformAccountTransactionId: correctionDto.referencePlatformAccountTransactionId,
    });

    return plainToInstance(
      PlatformAccountTransactionResponseDto,
      savedTransaction,
      { groups: ['admin'], excludeExtraneousValues: true }
    );
  }
}