import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { Employee } from './employee.schema';
import { PaginateResult } from 'mongoose';
import {
  UpdateEmployeeCommand,
  BlockEmployeeCommand
} from './employee.commands';
import { GetEmployeeQuery, GetEmployeesQuery } from './employee.queries';

export interface EmployeePort {

  // ====================================================
  // COMMANDS
  // ==================================================== 
  updateEmployee(command: UpdateEmployeeCommand, options: CommonCommandOptions): Promise<void>;
  blockEmployee(command: BlockEmployeeCommand, options: CommonCommandOptions): Promise<void>;

  // ====================================================
  // QUERIES
  // ==================================================== 
  getEmployees(query: GetEmployeesQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Employee>>;
  getEmployee(query: GetEmployeeQuery, options: CommonQueryOptions): Promise<Employee | null>;
}

export const EMPLOYEE_PORT = Symbol('EMPLOYEE_PORT');