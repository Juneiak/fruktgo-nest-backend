import { Module } from "@nestjs/common";
import { ShopOrdersRoleService } from "./shop.orders.role.service";
import { ShopOrdersController } from "./shop.orders.controller";

@Module({
  controllers: [ShopOrdersController],
  providers: [ShopOrdersRoleService],
})
export class ShopOrdersApiModule {}