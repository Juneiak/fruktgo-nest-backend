import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BaseLogSchema } from './logs.schema';
import {LogsService} from './logs.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'BaseLog', schema: BaseLogSchema }]),
  ],
  controllers: [],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}