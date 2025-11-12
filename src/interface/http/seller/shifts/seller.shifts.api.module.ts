import { Module } from "@nestjs/common";
import { SellerShiftsRoleService } from "./seller.shifts.role.service";
import { SellerShiftsController } from "./seller.shifts.controller";
import { ShiftModule } from "src/modules/shift/shift.module";

@Module({
  imports: [ShiftModule],
  controllers: [SellerShiftsController],
  providers: [SellerShiftsRoleService],
})
export class SellerShiftsApiModule {}