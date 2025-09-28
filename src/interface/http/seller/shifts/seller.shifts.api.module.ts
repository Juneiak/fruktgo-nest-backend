import { Module } from "@nestjs/common";
import { SellerShiftsRoleService } from "./seller.shifts.role.service";
import { SellerShiftsController } from "./seller.shifts.controller";

@Module({
  controllers: [SellerShiftsController],
  providers: [SellerShiftsRoleService],
})
export class SellerShiftsApiModule {}