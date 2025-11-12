import { Module } from "@nestjs/common";
import { SellerMeController } from "./seller.me.controller";
import { SellerMeRoleService } from "./seller.me.role.service";
import { SellerModule } from "src/modules/seller/seller.module";

@Module({
  imports: [SellerModule],
  controllers: [SellerMeController],
  providers: [SellerMeRoleService],
})
export class SellerMeApiModule {}