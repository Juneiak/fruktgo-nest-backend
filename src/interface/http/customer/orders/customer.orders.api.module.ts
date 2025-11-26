import { Module } from "@nestjs/common";
import { CustomerOrdersRoleService } from "./customer.orders.role.service";
import { CustomerOrdersController } from "./customer.orders.controller";
import { OrderModule } from "src/modules/order";
import { CustomerModule } from "src/modules/customer";
import { AddressesModule } from "src/infra/addresses";
import { AccessModule } from "src/infra/access";
import { OrderProcessModule } from "src/processes/order";

@Module({
  imports: [
    OrderModule,
    CustomerModule,
    AddressesModule,
    AccessModule,
    OrderProcessModule,
  ],
  controllers: [CustomerOrdersController],
  providers: [CustomerOrdersRoleService],
})
export class CustomerOrdersApiModule {}