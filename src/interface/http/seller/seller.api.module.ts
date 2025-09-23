import { SellerProductsApiModule } from './products/seller.products.api.module';
import { SellerMeApiModule } from './me/seller.me.api.module';
import { RouterModule } from "@nestjs/core";
import { Module } from "@nestjs/common";

@Module({
  imports: [  
    RouterModule.register([
      { path: 'products', module: SellerProductsApiModule },
      { path: 'me', module: SellerMeApiModule },
    ]),
  ],
})
export class SellerApiModule {}