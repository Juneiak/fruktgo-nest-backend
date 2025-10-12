import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GetEmployeeQuery, GetEmployeesQuery } from './employee.queries';
import { checkId, assignField } from 'src/common/utils';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { PaginateResult, Types } from 'mongoose';
import { EmployeeModel, Employee } from './employee.schema';
import { BlockEmployeeCommand, UpdateEmployeeCommand } from './employee.commands';
import { DomainError } from 'src/common/errors/domain-error';
import { parcePhoneNumber } from 'src/common/utils';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: EmployeeModel,
  ) {}


  async getEmployees(
    query: GetEmployeesQuery,
    options: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Employee>> {
    checkId([query.sellerId, query.shopId]);

    const queryFilter: any = {};
    if (query.shopId) queryFilter.pinnedTo = new Types.ObjectId(query.shopId);
    if (query.sellerId) queryFilter.employer = new Types.ObjectId(query.sellerId);

    const queryOptions: any = {
      page: options.pagination?.page || 1,
      limit: options.pagination?.pageSize || 10,
      lean: true, leanWithId: true,
      sort: options.sort || { createdAt: -1 }
    };
    
    const result = await this.employeeModel.paginate(queryFilter, queryOptions);
    return result;
  }


  async getEmployee(
    query: GetEmployeeQuery,
    option: CommonQueryOptions
  ): Promise<Employee | null> {
    checkId([query.employeeId]);

    const queryFilter: any = {};
    if (query.employeeId) queryFilter._id = new Types.ObjectId(query.employeeId);
    else if (query.phoneNumber) {
      const phone = parcePhoneNumber(query.phoneNumber);
      if (!phone) throw new DomainError({ code: 'NOT_FOUND', message: 'Сотрудник не найден' });
      queryFilter.phoneNumber = phone.number;
    }
    else throw new DomainError({ code: 'NOT_FOUND', message: 'Сотрудник не найден' });

    const dbQuery = this.employeeModel.findOne(queryFilter)
    if (option.session) dbQuery.session(option.session);
    const employee = await dbQuery.lean({ virtuals: true }).exec();

    return employee;
  }


  async updateSellerEmployee(
    command: UpdateEmployeeCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { employeeId, payload } = command;
    checkId([employeeId ]);
     
    const dbQuery = this.employeeModel.findById(new Types.ObjectId(employeeId));
    if (options.session) dbQuery.session(options.session);
    
    const employee = await dbQuery.exec();
    if (!employee) throw new DomainError({ code: 'NOT_FOUND', message: 'Сотрудник не найден' });
    
    assignField(employee, 'verifiedStatus', payload.verifiedStatus, {onNull: 'skip'});
    assignField(employee, 'internalNote', payload.internalNote);
    assignField(employee, 'position', payload.position);
    assignField(employee, 'salary', payload.salary);
    assignField(employee, 'sellerNote', payload.sellerNote);
    assignField(employee, 'status', payload.status, {onNull: 'skip'});

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await employee.save(saveOptions);
  };



   async blockEmployee(
     command: BlockEmployeeCommand,
     options: CommonCommandOptions
   ): Promise<void> {
     const { employeeId, payload } = command;
     checkId([employeeId]);
     
     const dbQuery = this.employeeModel.findById(new Types.ObjectId(employeeId));
     if (options.session) dbQuery.session(options.session);

     const employee = await dbQuery.exec();
     if (!employee) throw new DomainError({ code: 'NOT_FOUND', message: 'Сотрудник не найден' });
     
     assignField(employee.blocked, 'status', payload.status, { onNull: 'skip' });
     assignField(employee.blocked, 'reason', payload.reason );
     assignField(employee.blocked, 'code', payload.code );
     assignField(employee.blocked, 'blockedUntil', payload.blockedUntil );
 
     const saveOptions: any = {};
     if (options.session) saveOptions.session = options.session;
 
     await employee.save(saveOptions);
   }
}