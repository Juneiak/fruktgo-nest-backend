import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema, Product } from './product.schema';
import { PlatformService } from './platform.service';
import { PlatformFacade } from './platform.facade';
import { PLATFORM_PORT } from './platform.port';
import { SellerModule } from '../seller/seller.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Platform.name, schema: PlatformSchema }]),
    SellerModule,  // Для доступа к SellerPort
  ],
  providers: [
    ProductService,
    ProductFacade,
    { provide: PRODUCT_PORT, useExisting: ProductFacade }
  ],
  exports: [PRODUCT_PORT],
})
export class PlatformModule {}