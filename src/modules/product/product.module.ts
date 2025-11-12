import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { PRODUCT_PORT } from './product.port';
import { ProductSchema, Product } from './product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  providers: [
    ProductService,
    { provide: PRODUCT_PORT, useExisting: ProductService },
  ],
  exports: [PRODUCT_PORT],
})
export class ProductModule {}