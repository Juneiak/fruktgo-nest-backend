import { Module } from "@nestjs/common";
import { SellerShopProductsRoleService } from "./seller.shop-products.role.service";
import { SellerShopProductsController } from "./seller.shop-products.controller";
import { StockMovementModule } from "src/modules/stock-movement";

@Module({
  imports: [StockMovementModule],
  controllers: [SellerShopProductsController],
  providers: [SellerShopProductsRoleService],
})
export class SellerShopProductsApiModule {}