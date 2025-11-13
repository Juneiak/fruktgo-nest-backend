import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopProductService } from './shop-product.service';
import { ShopProduct, ShopProductSchema } from './shop-product.schema';
import { SHOP_PRODUCT_PORT } from './shop-product.port';
import { ImagesModule } from 'src/infra/images/images.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ShopProduct.name, schema: ShopProductSchema }]),
    ImagesModule,
  ],
  providers: [
    ShopProductService,
    { provide: SHOP_PRODUCT_PORT, useExisting: ShopProductService }
  ],
  exports: [SHOP_PRODUCT_PORT],
})
export class ShopProductModule {}