import { RouterModule } from "@nestjs/core";
import { Module } from "@nestjs/common";

import { ShopAuthApiModule } from "./auth/shop.auth.api.module";
import { ShopMeApiModule } from "./me/shop.me.api.module";
import { ShopOrdersApiModule } from "./orders/shop.orders.api.module";
import { ShopShiftsApiModule } from "./shifts/shop.shifts.api.module";
import { ShopShopProductsApiModule } from "./shop-products/shop.shop-products.api.module";

@Module({
  imports: [  
    RouterModule.register([
      { path: 'auth', module: ShopAuthApiModule },
      { path: 'me', module: ShopMeApiModule },
      { path: 'orders', module: ShopOrdersApiModule },
      { path: 'shifts', module: ShopShiftsApiModule },
      { path: 'shop-products', module: ShopShopProductsApiModule },
    ]),
  ],
})
export class ShopApiModule {}