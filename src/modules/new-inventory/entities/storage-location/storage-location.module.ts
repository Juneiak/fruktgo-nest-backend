import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StorageLocation,
  StorageLocationSchema,
} from './storage-location.schema';
import { StorageLocationService } from './storage-location.service';
import { STORAGE_LOCATION_PORT } from './storage-location.port';
import { NewInventoryCoreModule } from '../../core';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StorageLocation.name, schema: StorageLocationSchema },
    ]),
    NewInventoryCoreModule,
  ],
  providers: [
    StorageLocationService,
    {
      provide: STORAGE_LOCATION_PORT,
      useExisting: StorageLocationService,
    },
  ],
  exports: [STORAGE_LOCATION_PORT, StorageLocationService],
})
export class StorageLocationModule {}
