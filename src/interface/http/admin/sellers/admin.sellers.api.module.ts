import { Module } from "@nestjs/common";
import { AdminSellersRoleService } from "./admin.sellers.role.service";
import { AdminSellersController } from "./admin.sellers.controller";
import { SellerModule } from "src/modules/seller/seller.module";

@Module({
  imports: [SellerModule],
  controllers: [AdminSellersController],
  providers: [AdminSellersRoleService],
})
export class AdminSellersApiModule {}