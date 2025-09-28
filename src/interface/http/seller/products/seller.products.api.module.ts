import { Module } from "@nestjs/common";
import { SellerProductsController } from "./seller.products.controller";
import { SellerProductsRoleService } from "./seller.products.role.service";

@Module({
  controllers: [SellerProductsController],
  providers: [SellerProductsRoleService],
})
export class SellerProductsApiModule {}