import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Audit, AuditSchema } from './audit.schema';
import { AuditService } from './audit.service';
import { AUDIT_PORT } from './audit.port';
import { BatchModule } from '../../batch';
import { BatchLocationModule } from '../../batch-location';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Audit.name, schema: AuditSchema }]),
    BatchModule,
    BatchLocationModule,
  ],
  providers: [
    AuditService,
    {
      provide: AUDIT_PORT,
      useExisting: AuditService,
    },
  ],
  exports: [AUDIT_PORT, AuditService],
})
export class AuditModule {}
