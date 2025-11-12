import { Module } from "@nestjs/common";
import { ShopShiftsRoleService } from "./shop.shifts.role.service";
import { ShopShiftsController } from "./shop.shifts.controller";
import { ShiftModule } from "src/modules/shift/shift.module";
import { ShopModule } from "src/modules/shop/shop.module";

@Module({
  imports: [ShiftModule, ShopModule],
  controllers: [ShopShiftsController],
  providers: [ShopShiftsRoleService],
})
export class ShopShiftsApiModule {}