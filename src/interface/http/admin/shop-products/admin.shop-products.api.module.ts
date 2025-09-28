import { Module } from "@nestjs/common";
import { AdminShopProductsRoleService } from "./admin.shop-products.role.service";
import { AdminShopProductsController } from "./admin.shop-products.controller";

@Module({
  controllers: [AdminShopProductsController],
  providers: [AdminShopProductsRoleService],
})
export class AdminShopProductsApiModule {}