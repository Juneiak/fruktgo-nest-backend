import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema, Product } from './product.schema';
import { ProductService } from './product.service';
import { ProductFacade } from './product.facade';
import { PRODUCT_PORT } from './product.port';
import { SellerModule } from '../seller/seller.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    SellerModule,  // Для доступа к SellerPort
  ],
  providers: [
    ProductService,
    ProductFacade,
    { provide: PRODUCT_PORT, useExisting: ProductFacade }
  ],
  exports: [PRODUCT_PORT],
})
export class ProductModule {}