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
  // QUERIES
  // ====================================================
  async getEmployees(
    query: GetEmployeesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Employee>> {
    return this.employeeService.getEmployees(query, queryOptions);
  }

  async getEmployee(
    query: GetEmployeeQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Employee | null> {
    return this.employeeService.getEmployee(query, queryOptions);
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async updateEmployee(
    command: UpdateEmployeeCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.employeeService.updateSellerEmployee(command, commandOptions);
  }

  async blockEmployee(
    command: BlockEmployeeCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.employeeService.blockEmployee(command, commandOptions);
  }
}