import { Module } from '@nestjs/common';
import { AdminController } from '../../interface/http/admin/platform/admin.platform.controller';
import { AdminService } from '../../interface/http/admin/platform/admin.platform.role.service';
import { AdminSharedService } from './shared/admin.shared.service';
import { AdminSupportModule } from 'src/interface/http/admin/support/admin.support.api.module';

@Module({
  imports: [
    AdminSupportModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminSharedService],
  exports: [AdminSharedService],
})
export class PlatformModule {}