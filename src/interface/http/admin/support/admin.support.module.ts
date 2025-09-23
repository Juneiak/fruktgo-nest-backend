import { Module } from '@nestjs/common';
import { AdminSupportRoleService } from './admin.support.role.service'
import { AdminSupportController } from './admin.support.controller';

@Module({
  controllers: [AdminSupportController],
  providers: [AdminSupportRoleService],
  exports: [AdminSupportRoleService],
})
export class AdminSupportModule {}