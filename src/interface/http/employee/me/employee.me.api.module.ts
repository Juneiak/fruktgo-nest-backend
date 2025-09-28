import { Module } from "@nestjs/common";
import { EmployeeMeRoleService } from "./employee.me.role.service";
import { EmployeeMeController } from "./employee.me.controller";

@Module({
  controllers: [EmployeeMeController],
  providers: [EmployeeMeRoleService],
})
export class EmployeeMeApiModule {}