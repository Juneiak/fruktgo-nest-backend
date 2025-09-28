import { Module } from "@nestjs/common";
import { SellerAuthRoleService } from "./seller.auth.role.service";
import { SellerAuthController } from "./seller.auth.controller";

@Module({
  controllers: [SellerAuthController],
  providers: [SellerAuthRoleService],
})
export class SellerAuthApiModule {}