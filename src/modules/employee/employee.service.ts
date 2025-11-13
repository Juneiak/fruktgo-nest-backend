import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GetEmployeeQuery, GetEmployeesQuery } from './employee.queries';
import { checkId, assignField, selectFields } from 'src/common/utils';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { PaginateResult, Types } from 'mongoose';
import { EmployeeModel, Employee } from './employee.schema';
import { BlockEmployeeCommand, UpdateEmployeeCommand } from './employee.commands';
import { DomainError } from 'src/common/errors/domain-error';
import { parcePhoneNumber } from 'src/common/utils';
import { EmployeePort } from './employee.port';

@Injectable()
export class EmployeeService implements EmployeePort {
  constructor(
    @InjectModel(Employee.name) private employeeModel: EmployeeModel,
  ) {}


  // ====================================================
  // QUERIES
  // ====================================================
  async getEmployees(
    query: GetEmployeesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Employee>> {

    const { filters, options } = query;

    const dbQueryFilter: any = {};
    if (filters?.shopId) dbQueryFilter.pinnedTo = new Types.ObjectId(filters.shopId);
    if (filters?.sellerId) dbQueryFilter.employer = new Types.ObjectId(filters.sellerId);
    if (filters?.verifiedStatuses) dbQueryFilter.verifiedStatus = { $in: filters.verifiedStatuses };
    if (filters?.blockedStatuses) dbQueryFilter.blocked.status = { $in: filters.blockedStatuses };
    if (filters?.sexes) dbQueryFilter.sex = { $in: filters.sexes };
    if (filters?.statuses) dbQueryFilter.status = { $in: filters.statuses };
    
    const dbQueryOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 10,
      lean: true, leanWithId: true,
      sort: queryOptions?.sort || { createdAt: -1 }
    };

    // Типобезопасный select - проверяется на этапе компиляции
    if (options?.select && options.select.length > 0) {
      dbQueryOptions.select = selectFields<Employee>(...options.select);
    }
    
    const result = await this.employeeModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  async getEmployee(
    query: GetEmployeeQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Employee | null> {
    const { filter, options } = query;

    let dbQueryFilter: any;
    if (filter?.employeeId) dbQueryFilter = { _id: new Types.ObjectId(filter.employeeId) };
    else if (filter?.telegramId) dbQueryFilter = { telegramId: filter.telegramId };
    else if (filter?.phone) {
      const phone = parcePhoneNumber(filter.phone);
      if (!phone) throw DomainError.badRequest('Неверные параметры запроса');
      dbQueryFilter.phone = phone.number;
    }
    else throw DomainError.badRequest('Неверные параметры запроса');

    const dbQuery = this.employeeModel.findOne(dbQueryFilter)
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    // Типобезопасный select - проверяется на этапе компиляции
    if (options?.select && options.select.length > 0) {
      dbQuery.select(selectFields<Employee>(...options.select));
    }

    const employee = await dbQuery.lean({ virtuals: true }).exec();
    return employee;
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async updateEmployee(
    command: UpdateEmployeeCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { employeeId, payload } = command;
    checkId([employeeId ]);
     
    const dbQuery = this.employeeModel.findById(new Types.ObjectId(employeeId));
    if (commandOptions?.session) dbQuery.session(commandOptions.session);
    
    const employee = await dbQuery.exec();
    if (!employee) throw DomainError.notFound('Employee', employeeId);
    
    assignField(employee, 'verifiedStatus', payload.verifiedStatus, {onNull: 'skip'});
    assignField(employee, 'internalNote', payload.internalNote);
    assignField(employee, 'position', payload.position);
    assignField(employee, 'salary', payload.salary);
    assignField(employee, 'sellerNote', payload.sellerNote);
    assignField(employee, 'status', payload.status, {onNull: 'skip'});

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    
    await employee.save(saveOptions);
  };


  async blockEmployee(
    command: BlockEmployeeCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { employeeId, payload } = command;
    checkId([employeeId]);
    
    const dbQuery = this.employeeModel.findById(new Types.ObjectId(employeeId));
    if (commandOptions?.session) dbQuery.session(commandOptions.session);

    const employee = await dbQuery.exec();
    if (!employee) throw DomainError.notFound('Employee', employeeId);
    
    assignField(employee.blocked, 'status', payload.status, { onNull: 'skip' });
    assignField(employee.blocked, 'reason', payload.reason );
    assignField(employee.blocked, 'code', payload.code );
    assignField(employee.blocked, 'blockedUntil', payload.blockedUntil );

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;

    await employee.save(saveOptions);
  }
}