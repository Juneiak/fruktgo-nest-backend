import { Module } from '@nestjs/common';
import { EmployeeIssuesController } from './employee.issues.controller';
import { EmployeeIssuesRoleService } from './employee.issues.role.service';

@Module({
  controllers: [EmployeeIssuesController],
  providers: [EmployeeIssuesRoleService],
})
export class EmployeeIssuesApiModule {}
