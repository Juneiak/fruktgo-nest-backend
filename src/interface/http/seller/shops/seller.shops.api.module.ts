import { Module } from "@nestjs/common";
import { SellerShopsRoleService } from "./seller.shops.role.service";
import { SellerShopsController } from "./seller.shops.controller";
import { ShopModule } from "src/modules/shop/shop.module";

@Module({
  imports: [ShopModule],
  controllers: [SellerShopsController],
  providers: [SellerShopsRoleService],
})
export class SellerShopsApiModule {}