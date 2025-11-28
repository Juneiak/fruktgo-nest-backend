import { Injectable, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { DomainError } from 'src/common/errors';
import { ShopPort, SHOP_PORT, ShopCommands } from 'src/modules/shop';
import { SellerPort, SELLER_PORT } from 'src/modules/seller';
import { 
  SHOP_ACCOUNT_PORT, 
  ShopAccountPort, 
  ShopAccountCommands 
} from 'src/modules/finance/shop-account';

import { CreateShopInput, CreateShopResult } from './shop-process.types';

export const SHOP_PROCESS_ORCHESTRATOR = Symbol('SHOP_PROCESS_ORCHESTRATOR');

/**
 * =====================================================
 * ОРКЕСТРАТОР МАГАЗИНОВ
 * =====================================================
 * 
 * Координирует создание магазина:
 * 1. Проверка продавца
 * 2. Создание ShopAccount (финансовый счёт магазина)
 * 3. Открытие первого расчётного периода
 * 4. Создание Shop с привязкой к ShopAccount
 * 5. Обновление статистики продавца
 */
@Injectable()
export class ShopProcessOrchestrator {
  
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort,
    @Inject(SELLER_PORT) private readonly sellerPort: SellerPort,
    @Inject(SHOP_ACCOUNT_PORT) private readonly shopAccountPort: ShopAccountPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  
  /**
   * Создание магазина с финансовым счётом и первым расчётным периодом.
   * Все операции выполняются в транзакции.
   */
  async createShop(input: CreateShopInput): Promise<CreateShopResult> {
    // Проверяем продавца
    const seller = await this.sellerPort.getSeller({
      filter: { sellerId: input.sellerId }
    });
    
    if (!seller) {
      throw DomainError.notFound('Seller', input.sellerId);
    }
    
    if (!seller.account) {
      throw DomainError.invariant('У продавца нет финансового счёта');
    }
    
    // Создание в транзакции
    const session = await this.connection.startSession();
    let result: CreateShopResult;
    
    try {
      await session.withTransaction(async () => {
        // Генерируем ID заранее для связей
        const shopId = new Types.ObjectId();
        
        // 1. Создаём ShopAccount (финансовый счёт магазина)
        const shopAccount = await this.shopAccountPort.createShopAccount(
          new ShopAccountCommands.CreateShopAccountCommand({
            shopId: shopId.toString(),
            sellerAccountId: seller.account.toString(),
          }),
          { session }
        );
        
        // 2. Открываем первый расчётный период
        const settlementPeriod = await this.shopAccountPort.openSettlementPeriod(
          new ShopAccountCommands.OpenSettlementPeriodCommand(shopAccount._id.toString()),
          { session }
        );
        
        // 3. Создаём магазин
        const shop = await this.shopPort.createShop(
          new ShopCommands.CreateShopCommand(shopId.toString(), {
            shopAccountId: shopAccount._id.toString(),
            ownerId: input.sellerId,
            shopName: input.shopName,
            city: input.city,
            address: input.address,
          }),
          { session }
        );
        
        result = {
          shop,
          shopAccountId: shopAccount._id.toString(),
          settlementPeriodId: settlementPeriod._id.toString(),
        };
      });
      
      // Событие
      this.eventEmitter.emit('shop.created', {
        shopId: result!.shop._id.toString(),
        sellerId: input.sellerId,
        shopAccountId: result!.shopAccountId,
      });
      
      return result!;
    } finally {
      await session.endSession();
    }
  }
}
