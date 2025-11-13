import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeSchema, Employee } from './employee.schema';
import { EmployeeService } from './employee.service';
import { EMPLOYEE_PORT } from './employee.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Employee.name, schema: EmployeeSchema }]),
  ],
  providers: [
    EmployeeService,
    { provide: EMPLOYEE_PORT, useExisting: EmployeeService }
  ],
  exports: [
    EMPLOYEE_PORT
  ],
})
export class EmployeeModule {}