import { Module } from "@nestjs/common";
import { AdminShiftsRoleService } from "./admin.shifts.role.service";
import { AdminShiftsController } from "./admin.shifts.controller";

@Module({
  controllers: [AdminShiftsController],
  providers: [AdminShiftsRoleService],
})
export class AdminShiftsApiModule {}