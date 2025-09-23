import { AdminSellersRoleService } from "./admin.sellers.role.service";
import { AdminSellersController } from "./admin.sellers.controller";
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  controllers: [AdminSellersController],
  providers: [AdminSellersRoleService],
})
export class AdminSellersApiModule {}