import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PRICING_PORT } from './pricing.port';
import { StorefrontModule } from '../entities/storefront';

@Module({
  imports: [StorefrontModule],
  providers: [
    PricingService,
    {
      provide: PRICING_PORT,
      useExisting: PricingService,
    },
  ],
  exports: [PRICING_PORT, PricingService],
})
export class PricingModule {}
