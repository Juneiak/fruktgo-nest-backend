import { Module } from "@nestjs/common";
import { ShopShiftsRoleService } from "./shop.shifts.role.service";
import { ShopShiftsController } from "./shop.shifts.controller";

@Module({
  controllers: [ShopShiftsController],
  providers: [ShopShiftsRoleService],
})
export class ShopShiftsApiModule {}