import { Module } from '@nestjs/common';
import {
  ExpirationAlertService,
  EXPIRATION_ALERT_SERVICE,
} from './expiration-alert.service';
import { BatchModule } from '../batch';
import { BatchLocationModule } from '../batch-location';
import { WriteOffModule } from '../operations/write-off';

@Module({
  imports: [BatchModule, BatchLocationModule, WriteOffModule],
  providers: [
    ExpirationAlertService,
    {
      provide: EXPIRATION_ALERT_SERVICE,
      useExisting: ExpirationAlertService,
    },
  ],
  exports: [EXPIRATION_ALERT_SERVICE, ExpirationAlertService],
})
export class AlertsModule {}
