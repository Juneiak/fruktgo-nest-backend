// Enums
export { SalesChannel, MarginStatus } from './pricing.enums';

// Types (кроме PriceCalculation — используется из storefront)
export {
  ExpirationDiscountRule,
  AppliedDiscount,
  MarginInfo,
  BulkDiscount,
  PricingConfig,
  AutoDiscountResult,
} from './pricing.types';

// Commands & Queries
export * as PricingCommands from './pricing.commands';
export * as PricingQueries from './pricing.queries';

// Port & Service
export { PRICING_PORT, PricingPort } from './pricing.port';
export { PricingService } from './pricing.service';

// Module
export { PricingModule } from './pricing.module';
