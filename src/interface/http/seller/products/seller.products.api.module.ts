import { SellerProductsController } from "./seller.products.controller";
import { SellerProductsRoleService } from "./seller.products.role.service";

import { Module } from "@nestjs/common";

@Module({
  imports: [],
  controllers: [SellerProductsController],
  providers: [SellerProductsRoleService],
})
export class SellerProductsApiModule {}