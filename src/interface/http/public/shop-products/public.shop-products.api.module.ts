import { Module } from "@nestjs/common";
import { PublicShopProductsRoleService } from "./public.shop-products.role.service";
import { PublicShopProductsController } from "./public.shop-products.controller";

@Module({
  controllers: [PublicShopProductsController],
  providers: [PublicShopProductsRoleService],
})
export class PublicShopProductsApiModule {}