import { Injectable } from '@nestjs/common';
import { CreatePlatformAccountTransactionDto, UpdatePlatformAccountTransactionDto } from './platform-account.request.dtos';
import { PlatformAccountService } from './platform-account.service';
import { PlatformAccountTransaction } from './schemas/platform-account-transaction.schema';


@Injectable()
export class PlatformAccountPublicService {

  constructor(
    private platformAccountService: PlatformAccountService,
  ) {}

  // ====================================================
  // PLATFORM ACCOUNT
  // ====================================================


  // ====================================================
  // PLATFORM ACCOUNT TRANSACTION
  // ====================================================

  createPlatformAccountTransaction(createPlatformAccountTransactionDto: CreatePlatformAccountTransactionDto): Promise<PlatformAccountTransaction> {
    return this.platformAccountService.createPlatformAccountTransaction(createPlatformAccountTransactionDto);
  }

  updatePlatformAccountTransaction(platformAccountTransactionId: string, updatePlatformAccountTransactionDto: UpdatePlatformAccountTransactionDto): Promise<PlatformAccountTransaction> {
    return this.platformAccountService.updatePlatformAccountTransaction(platformAccountTransactionId, updatePlatformAccountTransactionDto);
  }
}