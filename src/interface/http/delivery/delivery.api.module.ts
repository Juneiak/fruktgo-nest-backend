import { RouterModule } from "@nestjs/core";
import { Module } from "@nestjs/common";

import { DeliveryOrdersApiModule } from "./orders/delivery.orders.api.module";

@Module({
  imports: [
    RouterModule.register([
      { path: 'orders', module: DeliveryOrdersApiModule },
    ]),
  ],
})
export class DeliveryApiModule {}