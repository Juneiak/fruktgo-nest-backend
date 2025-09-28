import { Module } from "@nestjs/common";
import { AdminSellersRoleService } from "./admin.sellers.role.service";
import { AdminSellersController } from "./admin.sellers.controller";

@Module({
  imports: [],
  controllers: [AdminSellersController],
  providers: [AdminSellersRoleService],
})
export class AdminSellersApiModule {}