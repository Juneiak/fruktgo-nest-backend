import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlatformSchema, Platform } from './platform.schema';
import { PlatformService } from './platform.service';
import { PLATFORM_PORT } from './platform.port';
import { SellerModule } from '../seller/seller.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Platform.name, schema: PlatformSchema }]),
    SellerModule,
  ],
  providers: [
    PlatformService,
    { provide: PLATFORM_PORT, useExisting: PlatformService }
  ],
  exports: [PLATFORM_PORT],
})
export class PlatformModule {}