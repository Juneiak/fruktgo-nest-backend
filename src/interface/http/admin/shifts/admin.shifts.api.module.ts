import { Module } from "@nestjs/common";
import { AdminShiftsRoleService } from "./admin.shifts.role.service";
import { AdminShiftsController } from "./admin.shifts.controller";
import { ShiftModule } from "src/modules/shift/shift.module";

@Module({
  imports: [ShiftModule],
  controllers: [AdminShiftsController],
  providers: [AdminShiftsRoleService],
})
export class AdminShiftsApiModule {}