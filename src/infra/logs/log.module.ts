import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LogSchema, Log } from './infrastructure/log.schema';
import {LogService} from './application/log.service';
import { LogFacade } from './application/log.facade';
import { LogEventsListener } from './application/log.events';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),
  ],
  providers: [
    LogService,
    LogFacade,
    LogEventsListener,
    { provide: 'LogPort', useExisting: LogFacade }
  ],
  exports: [LogService, LogFacade, 'LogPort'],
})
export class LogModule {}