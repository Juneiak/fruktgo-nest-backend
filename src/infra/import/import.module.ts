import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportJob, ImportJobSchema } from './import.schema';
import { ImportService } from './import.service';
import { ExcelParser } from './parsers/excel.parser';
import { WarehouseProductModule } from 'src/modules/warehouse-product';
import { ShopProductModule } from 'src/modules/shop-product';

export const IMPORT_SERVICE = Symbol('IMPORT_SERVICE');

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImportJob.name, schema: ImportJobSchema },
    ]),
    WarehouseProductModule,
    ShopProductModule,
  ],
  providers: [
    ExcelParser,
    ImportService,
    {
      provide: IMPORT_SERVICE,
      useExisting: ImportService,
    },
  ],
  exports: [IMPORT_SERVICE, ExcelParser],
})
export class ImportModule {}
