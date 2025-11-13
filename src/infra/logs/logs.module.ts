import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LogSchema, Log } from './log.schema';
import { LogsService } from './logs.service';
import { LogsEventsListener } from './logs.events';
import { LOGS_PORT } from './logs.port';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),
  ],
  providers: [
    LogsService,
    LogsEventsListener,
    { provide: LOGS_PORT, useExisting: LogsService }
  ],
  exports: [LOGS_PORT],
})
export class LogsModule {}