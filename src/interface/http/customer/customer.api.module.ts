import { RouterModule } from "@nestjs/core";
import { Module } from "@nestjs/common";

import { CustomerAuthApiModule } from "./auth/customer.auth.api.module";
import { CustomerCartApiModule } from "./cart/customer.cart.api.module";
import { CustomerMeApiModule } from "./me/customer.me.api.module";
import { CustomerOrdersApiModule } from "./orders/customer.orders.api.module";

@Module({
  imports: [
    RouterModule.register([
      { path: 'auth', module: CustomerAuthApiModule },
      { path: 'cart', module: CustomerCartApiModule },
      { path: 'me', module: CustomerMeApiModule },
      { path: 'orders', module: CustomerOrdersApiModule },
    ]),
  ],
})
export class CustomerApiModule {}