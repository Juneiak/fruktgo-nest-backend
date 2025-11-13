import { Module } from '@nestjs/common';
import { AdminIssuesRoleService } from './admin.issues.role.service'
import { AdminIssuesController } from './admin.issues.controller';

@Module({
  controllers: [AdminIssuesController],
  providers: [AdminIssuesRoleService],
})
export class AdminIssuesApiModule {}