import { Module } from "@nestjs/common";
import { SellerShopProductsRoleService } from "./seller.shop-products.role.service";
import { SellerShopProductsController } from "./seller.shop-products.controller";

@Module({
  controllers: [SellerShopProductsController],
  providers: [SellerShopProductsRoleService],
})
export class SellerShopProductsApiModule {}