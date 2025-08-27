import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { SettlementPeriodTransaction } from './schemas/settlement-period-transaction.schema';
import { SettlementPeriod } from './schemas/settlement-period.schema';
import { ShopAccount } from './schemas/shop-account.schema';
import { CreateSettlementPeriodTransactionDto, UpdateSettlementPeriodTransactionDto } from './shop-account.request.dtos'
import { checkId } from 'src/common/utils';
import { SettlementPeriodStatus } from './schemas/settlement-period.schema';
import { ShopAccountService } from './shop-account.service';

@Injectable()
export class ShopAccountPublicService {

  constructor(
    @InjectModel('SettlementPeriodTransaction') private shopTransactionModel: Model<SettlementPeriodTransaction>,
    @InjectModel('SettlementPeriod') private settlementPeriodModel: Model<SettlementPeriod>,
    @InjectModel('ShopAccount') private shopAccountModel: Model<ShopAccount>,
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