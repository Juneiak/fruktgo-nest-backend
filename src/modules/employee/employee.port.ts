import { CommonCommandOptions } from 'src/common/types/commands';
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
  // QUERIES
  // ==================================================== 
  getEmployees(query: GetEmployeesQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Employee>>;
  getEmployee(query: GetEmployeeQuery, queryOptions?: CommonQueryOptions): Promise<Employee | null>;

  
  // ====================================================
  // COMMANDS
  // ==================================================== 
  updateEmployee(command: UpdateEmployeeCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  blockEmployee(command: BlockEmployeeCommand, commandOptions?: CommonCommandOptions): Promise<void>;


}

export const EMPLOYEE_PORT = Symbol('EMPLOYEE_PORT');