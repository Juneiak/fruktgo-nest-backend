import { Shop } from 'src/modules/shop';

/**
 * =====================================================
 * ТИПЫ ДЛЯ SHOP PROCESS ORCHESTRATOR
 * =====================================================
 */

export interface CreateShopInput {
  /** ID продавца-владельца */
  sellerId: string;
  /** Название магазина */
  shopName: string;
  /** Город */
  city: string;
  /** Адрес */
  address?: {
    latitude?: number;
    longitude?: number;
    street?: string;
    house?: string;
    city?: string;
  };
}

export interface CreateShopResult {
  shop: Shop;
  shopAccountId: string;
  settlementPeriodId: string;
}
