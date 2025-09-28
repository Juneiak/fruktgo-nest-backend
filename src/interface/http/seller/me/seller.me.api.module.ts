import { Module } from "@nestjs/common";
import { SellerMeController } from "./seller.me.controller";
import { SellerMeRoleService } from "./seller.me.role.service";

@Module({
  imports: [],
  controllers: [SellerMeController],
  providers: [SellerMeRoleService],
})
export class SellerMeApiModule {}