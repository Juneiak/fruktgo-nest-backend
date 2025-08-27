import { Module, forwardRef } from '@nestjs/common';
import { SupportService } from './support.service'
import { SupportController } from './support.controller';
import { NotificationModule } from 'src/modules/notification/notification.module';

@Module({
  imports: [
    forwardRef(() => NotificationModule)
  ],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}