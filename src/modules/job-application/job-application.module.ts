import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobApplicationSchema, JobApplication } from './job-application.schema';
import { JobApplicationService } from './job-application.service';
import { JobApplicationFacade } from './job-application.facade';
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
    JobApplicationFacade,
    { provide: JOB_APPLICATION_PORT, useExisting: JobApplicationFacade }
  ],
  exports: [JOB_APPLICATION_PORT],
})
export class JobApplicationModule {}