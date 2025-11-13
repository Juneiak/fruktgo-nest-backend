import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobApplicationSchema, JobApplication } from './job-application.schema';
import { JobApplicationService } from './job-application.service';
import { JOB_APPLICATION_PORT } from './job-application.port';
import { EmployeeModule } from '../employee/employee.module';
import { SellerModule } from '../seller/seller.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: JobApplication.name, schema: JobApplicationSchema }]),
    EmployeeModule,
    SellerModule,
  ],
  providers: [
    JobApplicationService,
    { provide: JOB_APPLICATION_PORT, useExisting: JobApplicationService }
  ],
  exports: [JOB_APPLICATION_PORT],
})
export class JobApplicationModule {}