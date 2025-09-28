import { Module } from "@nestjs/common";
import { CustomerCartRoleService } from "./customer.cart.role.service";
import { CustomerCartController } from "./customer.cart.controller";

@Module({
  controllers: [CustomerCartController],
  providers: [CustomerCartRoleService],
})
export class CustomerCartApiModule {}