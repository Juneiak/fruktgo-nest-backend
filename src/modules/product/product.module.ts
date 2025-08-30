import { Module } from "@nestjs/common";
import { ProductSellerController } from "./seller/product.seller.controller";
import { ProductSellerService } from "./seller/product.seller.service";
import { ProductAdminController } from "./admin/product.admin.controller";
import { ProductAdminService } from "./admin/product.admin.service";
import { ProductSharedService } from "./product.shared.service";

@Module({
  imports: [],
  controllers: [ProductSellerController, ProductAdminController],
  providers: [ProductSellerService, ProductAdminService, ProductSharedService],
  exports: [ProductSharedService],
})
export class ProductModule {}