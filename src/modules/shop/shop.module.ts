import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopService } from './shop.service';
import { ShopSchema } from './shop.schema';
import { Shop } from './shop.schema';
import { ShopFacade } from './shop.facade';
import { SHOP_PORT } from './shop.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Shop.name, schema: ShopSchema }]),
  ],
  providers: [
    ShopService,
    ShopFacade,
    { provide: SHOP_PORT, useExisting: ShopFacade }
  ],
  exports: [SHOP_PORT],
})
export class ShopModule {}