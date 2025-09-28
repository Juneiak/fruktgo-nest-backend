import { Module } from "@nestjs/common";
import { SellerOrdersRoleService } from "./seller.orders.role.service";
import { SellerOrdersController } from "./seller.orders.controller";

@Module({
  controllers: [SellerOrdersController],
  providers: [SellerOrdersRoleService],
})
export class SellerOrdersApiModule {}