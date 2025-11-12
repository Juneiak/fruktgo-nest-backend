import { Module } from "@nestjs/common";
import { SellerProductsController } from "./seller.products.controller";
import { SellerProductsRoleService } from "./seller.products.role.service";
import { ProductModule } from "src/modules/product/product.module";

@Module({
  imports: [ProductModule],
  controllers: [SellerProductsController],
  providers: [SellerProductsRoleService],
})
export class SellerProductsApiModule {}