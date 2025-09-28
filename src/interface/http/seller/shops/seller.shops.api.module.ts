import { Module } from "@nestjs/common";
import { SellerShopsRoleService } from "./seller.shops.role.service";
import { SellerShopsController } from "./seller.shops.controller";

@Module({
  controllers: [SellerShopsController],
  providers: [SellerShopsRoleService],
})
export class SellerShopsApiModule {}