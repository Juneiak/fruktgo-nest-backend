import { SellerProductsApiModule } from './products/seller.products.api.module';
import { SellerMeApiModule } from './me/seller.me.api.module';
import { RouterModule } from "@nestjs/core";
import { Module } from "@nestjs/common";

import { SellerAuthApiModule } from './auth/seller.auth.api.module';
import { SellerEmployeesApiModule } from './employees/seller.employees.api.module';
import { SellerOrdersApiModule } from './orders/seller.orders.api.module';
import { SellerShiftsApiModule } from './shifts/seller.shifts.api.module';
import { SellerShopProductsApiModule } from './shop-products/seller.shop-products.api.module';
import { SellerShopsApiModule } from './shops/seller.shops.api.module';

@Module({
  imports: [  
    RouterModule.register([
      { path: 'auth', module: SellerAuthApiModule },
      { path: 'employees', module: SellerEmployeesApiModule },
      { path: 'me', module: SellerMeApiModule },
      { path: 'orders', module: SellerOrdersApiModule },
      { path: 'shifts', module: SellerShiftsApiModule },
      { path: 'products', module: SellerProductsApiModule },
      { path: 'shop-products', module: SellerShopProductsApiModule },
      { path: 'shops', module: SellerShopsApiModule },
    ]),
  ],
})
export class SellerApiModule {}