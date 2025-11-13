import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GetJobApplicationsQuery, GetJobApplicationQuery } from './job-application.queries';
import { assignField, checkId, selectFields } from 'src/common/utils';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { PaginateResult, Types } from 'mongoose';
import { JobApplicationModel, JobApplication } from './job-application.schema';
import { CreateJobApplicationCommand, UpdateJobApplicationCommand } from './job-application.commands';
import { EMPLOYEE_PORT, EmployeePort } from '../employee/employee.port';
import { EmployeeQueries } from '../employee';
import { SELLER_PORT, SellerPort } from '../seller/seller.port';
import { SellerQueries } from '../seller';
import { JobApplicationStatus } from './job-application.enums';
import { DomainError } from 'src/common/errors/domain-error';
import { JobApplicationPort } from './job-application.port';

@Injectable()
export class JobApplicationService implements JobApplicationPort {
  constructor(
    @InjectModel(JobApplication.name) private jobApplicationModel: JobApplicationModel,
    @Inject(EMPLOYEE_PORT) private employeePort: EmployeePort,
    @Inject(SELLER_PORT) private sellerPort: SellerPort,
  ) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getPaginatedJobApplications(
    query: GetJobApplicationsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<JobApplication>> {
    const { filters, options } = query;
    checkId([filters?.sellerId, filters?.employeeId]);

    const dbQueryFilter: any = {};
    if (filters?.sellerId) dbQueryFilter['seller.sellerId'] = new Types.ObjectId(filters.sellerId);
    if (filters?.employeeId) dbQueryFilter['employee.employeeId'] = new Types.ObjectId(filters.employeeId);
    if (filters?.statuses && filters.statuses.length > 0) {
      dbQueryFilter.status = { $in: filters.statuses };
    }
    if (filters?.fromDate || filters?.toDate) {
      dbQueryFilter.createdAt = {
        ...(filters.fromDate ? { $gte: filters.fromDate } : {}),
        ...(filters.toDate ? { $lte: filters.toDate } : {}),
      };
    }

    const dbQueryOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: queryOptions?.sort || { createdAt: -1 }
    };

    // Типобезопасный select - проверяется на этапе компиляции
    if (options?.select && options.select.length > 0) {
      dbQueryOptions.select = selectFields<JobApplication>(...options.select);
    }
    
    const result = await this.jobApplicationModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  async getJobApplications(
    query: GetJobApplicationsQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<JobApplication[]> {
    
    const { filters, options } = query;
    checkId([filters?.sellerId, filters?.employeeId]);

    const dbQueryFilter: any = {};
    if (filters?.sellerId) dbQueryFilter['seller.sellerId'] = new Types.ObjectId(filters.sellerId);
    if (filters?.employeeId) dbQueryFilter['employee.employeeId'] = new Types.ObjectId(filters.employeeId);
    
    if (filters?.statuses && filters.statuses.length > 0) {
      dbQueryFilter.status = { $in: filters.statuses };
    }
    if (filters?.fromDate || filters?.toDate) {
      dbQueryFilter.createdAt = {
        ...(filters.fromDate ? { $gte: filters.fromDate } : {}),
        ...(filters.toDate ? { $lte: filters.toDate } : {}),
      };
    }

    const dbQuery = this.jobApplicationModel.find(dbQueryFilter).sort({ createdAt: -1 });
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    // Типобезопасный select - проверяется на этапе компиляции
    if (options?.select && options.select.length > 0) {
      dbQuery.select(selectFields<JobApplication>(...options.select));
    }
    
    const jobApplications = await dbQuery.lean({ virtuals: true }).exec();
    return jobApplications;
  }


  async getJobApplication(
    query: GetJobApplicationQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<JobApplication> {
    const { jobApplicationId, options } = query;
    checkId([jobApplicationId]);

    const dbQuery = this.jobApplicationModel.findById(new Types.ObjectId(jobApplicationId));
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    // Типобезопасный select - проверяется на этапе компиляции
    if (options?.select && options.select.length > 0) {
      dbQuery.select(selectFields<JobApplication>(...options.select));
    }

    const jobApplication = await dbQuery.lean({ virtuals: true }).exec();
    if (!jobApplication) throw DomainError.notFound('JobApplication', jobApplicationId);
    
    return jobApplication;
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createJobApplication(
    command: CreateJobApplicationCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<JobApplication> {
    const { payload, jobApplicationId } = command;

    checkId([payload.sellerId, payload.employeeId]);

    // Получаем продавца через Port
    const seller = await this.sellerPort.getSeller(
      new SellerQueries.GetSellerQuery({ sellerId: payload.sellerId }), 
      commandOptions
    );
    if (!seller) throw DomainError.notFound('Seller', payload.sellerId);

    // Получаем сотрудника через Port
    const employee = await this.employeePort.getEmployee(
      new EmployeeQueries.GetEmployeeQuery({ employeeId: payload.employeeId }), 
      commandOptions
    );
    if (!employee) throw DomainError.notFound('Employee', payload.employeeId);

    // Бизнес-правило: сотрудник не должен быть занят
    if (employee.employer) throw DomainError.conflict('Сотрудник уже работает у другого продавца');
    
    // Проверяем дубликаты
    const existingQuery = this.jobApplicationModel.findOne({
      'seller.sellerId': new Types.ObjectId(payload.sellerId),
      'employee.employeeId': new Types.ObjectId(payload.employeeId),
      status: JobApplicationStatus.PENDING
    });
    if (commandOptions?.session) existingQuery.session(commandOptions.session);
    
    const existing = await existingQuery.exec();
    if (existing) throw DomainError.conflict('Запрос уже отправлен');

    // Создаем заявку с вложенными объектами
    const jobApplicationData: any = {
      _id: jobApplicationId ? new Types.ObjectId(jobApplicationId) : undefined,
      employee: {
        employeeId: employee._id,
        employeeName: employee.employeeName,
        employeePhone: employee.phone,
      },
      seller: {
        sellerId: seller._id,
        sellerCompanyName: seller.companyName,
      },
      status: JobApplicationStatus.PENDING,
    };

    const queryOptions: any = {};
    if (commandOptions?.session) queryOptions.session = commandOptions.session;

    const jobApplication = await this.jobApplicationModel.create([jobApplicationData], queryOptions).then(docs => docs[0]);
    return jobApplication;
  }


  async updateJobApplication(
    command: UpdateJobApplicationCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<JobApplication> {

    const { jobApplicationId, payload } = command;
    checkId([jobApplicationId]);

    const dbQuery = this.jobApplicationModel.findOne({ _id: new Types.ObjectId(jobApplicationId) });
    if (commandOptions?.session) dbQuery.session(commandOptions.session);
    
    const jobApplication = await dbQuery.exec();
    if (!jobApplication) throw DomainError.notFound('JobApplication', jobApplicationId);
    
    assignField(jobApplication, 'status', payload.status, { onNull: 'skip' });

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;

    await jobApplication.save(saveOptions);
    return jobApplication;
  }


  async deleteJobApplication(
    jobApplicationId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<JobApplication> {
    
    checkId([jobApplicationId]);

    const dbQuery = this.jobApplicationModel.findOne({ _id: new Types.ObjectId(jobApplicationId) });
    if (commandOptions?.session) dbQuery.session(commandOptions.session);
    
    const jobApplication = await dbQuery.exec();
    if (!jobApplication) throw DomainError.notFound('JobApplication', jobApplicationId);
    
    const deleteOptions: any = {};
    if (commandOptions?.session) deleteOptions.session = commandOptions.session;

    await jobApplication.deleteOne(deleteOptions);
    return jobApplication;
  }
}