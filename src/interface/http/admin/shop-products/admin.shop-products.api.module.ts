import { Module } from "@nestjs/common";
import { AdminShopProductsRoleService } from "./admin.shop-products.role.service";
import { AdminShopProductsController } from "./admin.shop-products.controller";
import { ShopProductModule } from "src/modules/shop-product/shop-product.module";

@Module({
  imports: [ShopProductModule],
  controllers: [AdminShopProductsController],
  providers: [AdminShopProductsRoleService],
})
export class AdminShopProductsApiModule {}