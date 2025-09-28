import { Module } from "@nestjs/common";
import { SellerEmployeesRoleService } from "./seller.employees.role.service";
import { SellerEmployeesController } from "./seller.employees.controller";

@Module({
  controllers: [SellerEmployeesController],
  providers: [SellerEmployeesRoleService],
})
export class SellerEmployeesApiModule {}