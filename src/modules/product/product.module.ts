import { Module } from "@nestjs/common";
import { ProductSellerController } from "./roles/seller/product.seller.controller";
import { ProductSellerService } from "./roles/seller/product.seller.service";
import { ProductAdminController } from "./roles/admin/product.admin.controller";
import { ProductAdminService } from "./roles/admin/product.admin.service";
import { ProductSharedService } from "./shared/product.shared.service";

@Module({
  imports: [],
  controllers: [ProductSellerController, ProductAdminController],
  providers: [ProductSellerService, ProductAdminService, ProductSharedService],
  exports: [ProductSharedService],
})
export class ProductModule {}