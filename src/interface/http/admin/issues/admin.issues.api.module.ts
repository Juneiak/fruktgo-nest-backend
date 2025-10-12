import { Module } from '@nestjs/common';
import { AdminSupportRoleService } from './admin.support.role.service'
import { AdminSupportController } from './admin.support.controller';

@Module({
  controllers: [AdminIssuesController],
  providers: [AdminIssuesRoleService],
})
export class AdminIssuesApiModule {}