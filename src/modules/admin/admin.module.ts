import { Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { SupportModule } from 'src/modules/support/support.module';
import { AdminSharedService } from './shared/admin.shared.service';

@Module({
  imports: [
    SupportModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminSharedService],
  exports: [AdminSharedService],
})
export class AdminModule {}