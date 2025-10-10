import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeSchema, Employee } from './employee.schema';
import { EmployeeService } from './employee.service';
import { EmployeeFacade } from './employee.facade';
import { EMPLOYEE_PORT } from './employee.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Employee.name, schema: EmployeeSchema }]),
  ],
  providers: [
    EmployeeService,
    EmployeeFacade,
    { provide: EMPLOYEE_PORT, useExisting: EmployeeFacade }
  ],
  exports: [
    EMPLOYEE_PORT
  ],
})
export class EmployeeModule {}