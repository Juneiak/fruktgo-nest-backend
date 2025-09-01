import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlatformAccountAdminController } from './admin/platform-account.admin.controller';
import { PlatformAccountService } from './platform-account.service';
import { PlatformAccountSchema } from './schemas/platform-account.schema';
import { PlatformAccountSharedService } from './shared/platform-account.shared.service';
import { PlatformAccountAdminService } from './admin/platform-account.admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PlatformAccount', schema: PlatformAccountSchema },
    ])
  ],
  controllers: [PlatformAccountAdminController],
  providers: [
    PlatformAccountService,
    PlatformAccountAdminService,
    PlatformAccountSharedService
  ],
  exports: [PlatformAccountSharedService]
})
export class PlatformAccountModule {}
