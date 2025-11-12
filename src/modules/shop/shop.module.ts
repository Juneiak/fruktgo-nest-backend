import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopService } from './shop.service';
import { ShopSchema, Shop } from './shop.schema';
import { SHOP_PORT } from './shop.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Shop.name, schema: ShopSchema }]),
  ],
  providers: [
    ShopService,
    { provide: SHOP_PORT, useExisting: ShopService },
  ],
  exports: [SHOP_PORT],
})
export class ShopModule {}