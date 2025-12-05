import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Storefront, StorefrontSchema } from './storefront.schema';
import { StorefrontService } from './storefront.service';
import { STOREFRONT_PORT } from './storefront.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Storefront.name, schema: StorefrontSchema },
    ]),
  ],
  providers: [
    StorefrontService,
    {
      provide: STOREFRONT_PORT,
      useExisting: StorefrontService,
    },
  ],
  exports: [STOREFRONT_PORT, StorefrontService],
})
export class StorefrontModule {}
