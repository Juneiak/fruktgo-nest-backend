import { Module } from "@nestjs/common";
import { ShopShopProductsRoleService } from "./shop.shop-products.role.service";
import { ShopShopProductsController } from "./shop.shop-products.controller";

@Module({
  controllers: [ShopShopProductsController],
  providers: [ShopShopProductsRoleService],
})
export class ShopShopProductsApiModule {}