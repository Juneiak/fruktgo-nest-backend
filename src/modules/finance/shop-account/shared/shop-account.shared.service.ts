import { Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { SettlementPeriodTransaction } from '../schemas/settlement-period-transaction.schema';
import { CreateSettlementPeriodTransactionDto, UpdateSettlementPeriodTransactionDto } from './shop-account.shared.request.dto'
import { ShopAccountService } from '../shop-account.service';

@Injectable()
export class ShopAccountSharedService {

  constructor(
    private shopAccountService: ShopAccountService,
  ) {}

  

  // ====================================================
  // SHOP ACCOUNT
  // ====================================================



  // ====================================================
  // SETTLEMENT PERIOD
  // ====================================================



  // ====================================================
  // SETTLEMENT PERIOD TRANSACTION
  // ====================================================
  async createSettlementPeriodTransaction(
    createSettlementPeriodTransactionDto: CreateSettlementPeriodTransactionDto,
    session?: ClientSession
  ): Promise<SettlementPeriodTransaction> {
    return this.shopAccountService.createSettlementPeriodTransaction(createSettlementPeriodTransactionDto, session);
  }


  async updateSettlementPeriodTransaction(
    settlementPeriodTransactionId: string,
    updateSettlementPeriodTransactionDto: UpdateSettlementPeriodTransactionDto,
    session?: ClientSession
  ): Promise<SettlementPeriodTransaction> {
    return this.shopAccountService.updateSettlementPeriodTransaction(settlementPeriodTransactionId, updateSettlementPeriodTransactionDto, session);
  }
}