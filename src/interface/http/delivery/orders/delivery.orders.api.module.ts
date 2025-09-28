import { Module } from "@nestjs/common";
import { DeliveryOrdersRoleService } from "./delivery.orders.role.service";
import { DeliveryOrdersController } from "./delivery.orders.controller";

@Module({
  controllers: [DeliveryOrdersController],
  providers: [DeliveryOrdersRoleService],
})
export class DeliveryOrdersApiModule {}