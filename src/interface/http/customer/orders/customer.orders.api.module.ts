import { Module } from "@nestjs/common";
import { CustomerOrdersRoleService } from "./customer.orders.role.service";
import { CustomerOrdersController } from "./customer.orders.controller";

@Module({
  controllers: [CustomerOrdersController],
  providers: [CustomerOrdersRoleService],
})
export class CustomerOrdersApiModule {}