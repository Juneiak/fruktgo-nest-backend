import { Module } from "@nestjs/common";
import { ProductForSellerService } from "./for-seller/product-for-seller.service";
import { ProductForSellerController } from "./for-seller/product-for-seller.controller";
import { ProductForAdminService } from "./for-admin/product-for-admin.service";
import { ProductForAdminController } from "./for-admin/product-for-admin.controller";

@Module({
  imports: [],
  controllers: [ProductForSellerController, ProductForAdminController],
  providers: [ProductForSellerService, ProductForAdminService],
  exports: [],
})
export class ProductModule {}