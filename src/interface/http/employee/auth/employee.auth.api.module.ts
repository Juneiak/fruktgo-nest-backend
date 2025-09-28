import { Module } from "@nestjs/common";
import { EmployeeAuthRoleService } from "./employee.auth.role.service";
import { EmployeeAuthController } from "./employee.auth.controller";

@Module({
  controllers: [EmployeeAuthController],
  providers: [EmployeeAuthRoleService],
})
export class EmployeeAuthApiModule {}