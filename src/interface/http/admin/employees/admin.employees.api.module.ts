import { AdminEmployeesController } from "./admin.employees.controller";
import { AdminEmployeesRoleService } from "./admin.employees.role.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  controllers: [AdminEmployeesController],
  providers: [AdminEmployeesRoleService],
})
export class AdminEmployeesApiModule {}