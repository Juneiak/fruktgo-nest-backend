import { Module } from '@nestjs/common';
import { CustomerIssuesController } from './customer.issues.controller';
import { CustomerIssuesRoleService } from './customer.issues.role.service';

@Module({
  controllers: [CustomerIssuesController],
  providers: [CustomerIssuesRoleService],
})
export class CustomerIssuesApiModule {}
