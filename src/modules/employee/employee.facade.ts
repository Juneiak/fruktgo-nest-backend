import { Injectable } from '@nestjs/common';
import { EmployeePort } from './employee.port';
import { EmployeeService } from './employee.service';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { Employee } from './employee.schema';
import { PaginateResult } from 'mongoose';
import {
  UpdateEmployeeCommand,
  BlockEmployeeCommand
} from './employee.commands';
import { GetEmployeeQuery, GetEmployeesQuery } from './employee.queries';

@Injectable()
export class EmployeeFacade implements EmployeePort {
  constructor(private readonly employeeService: EmployeeService) {}

  // ====================================================
  // COMMANDS
  // ====================================================
  async updateEmployee(command: UpdateEmployeeCommand, options: CommonCommandOptions): Promise<void> {
    return this.employeeService.updateSellerEmployee(command, options);
  }

  async blockEmployee(command: BlockEmployeeCommand, options: CommonCommandOptions): Promise<void> {
    return this.employeeService.blockEmployee(command, options);
  }

  // ====================================================
  // QUERIES
  // ====================================================
  async getEmployees(query: GetEmployeesQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Employee>> {
    return this.employeeService.getEmployees(query, options);
  }

  async getEmployee(query: GetEmployeeQuery, options: CommonQueryOptions): Promise<Employee | null> {
    return this.employeeService.getEmployee(query, options);
  }
}