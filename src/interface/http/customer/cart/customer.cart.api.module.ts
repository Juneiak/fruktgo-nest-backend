import { Module } from "@nestjs/common";
import { CustomerCartRoleService } from "./customer.cart.role.service";
import { CustomerCartController } from "./customer.cart.controller";
import { CartModule } from "src/modules/cart";

@Module({
  imports: [CartModule],
  controllers: [CustomerCartController],
  providers: [CustomerCartRoleService],
})
export class CustomerCartApiModule {}