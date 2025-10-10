import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LogSchema, Log } from './log.schema';
import { LogsService } from './logs.service';
import { LogsFacade } from './logs.facade';
import { LogsEventsListener } from './logs.events';
import { LOGS_PORT } from './logs.port';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),
  ],
  providers: [
    LogsService,
    LogsFacade,
    LogsEventsListener,
    { provide: LOGS_PORT, useExisting: LogsFacade }
  ],
  exports: [LOGS_PORT],
})
export class LogModule {}