import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlatformAccountControllerForAdmin } from './platform-account.controllers';
import { PlatformAccountService } from './platform-account.service';
import { PlatformAccountSchema } from './schemas/platform-account.schema';
import { PlatformAccountPublicService } from './platform-account.public.service';
import { PlatformAccountServiceForAdmin } from './platform-account.role-services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PlatformAccount', schema: PlatformAccountSchema },
    ])
  ],
  controllers: [PlatformAccountControllerForAdmin],
  providers: [
    PlatformAccountService,
    PlatformAccountServiceForAdmin,
    PlatformAccountPublicService
  ],
  exports: [PlatformAccountPublicService]
})
export class PlatformAccountModule {}
