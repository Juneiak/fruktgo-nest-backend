import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GetJobApplicationsQuery } from './job-application.queries';
import { assignField, checkId } from 'src/common/utils';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { PaginateResult, Types } from 'mongoose';
import { JobApplicationModel, JobApplication } from './job-application.schema';
import { CreateJobApplicationCommand, UpdateJobApplicationCommand } from './job-application.commands';
import { EMPLOYEE_PORT, EmployeePort } from '../employee/employee.port';
import { SELLER_PORT, SellerPort } from '../seller/seller.port';
import { JobApplicationStatus } from './job-application.enums';
import { DomainError } from 'src/common/errors/domain-error';
import { parcePhoneNumber } from 'src/common/utils';

@Injectable()
export class JobApplicationService {
  constructor(
    @InjectModel(JobApplication.name) private jobApplicationModel: JobApplicationModel,
    @Inject(EMPLOYEE_PORT) private employeePort: EmployeePort,
    @Inject(SELLER_PORT) private sellerPort: SellerPort,
  ) {}


  async getPaginatedJobApplications(
    query: GetJobApplicationsQuery,
    options: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<JobApplication>> {
    const { filters } = query;
    checkId([filters?.sellerId, filters?.employeeId]);

    const queryFilter: any = {};
    if (filters?.sellerId) queryFilter.sellerId = new Types.ObjectId(filters.sellerId);
    if (filters?.employeeId) queryFilter.employeeId = new Types.ObjectId(filters.employeeId);
    
    if (filters?.jobApplicationStatus) {
      queryFilter.jobApplicationStatus = Array.isArray(filters.jobApplicationStatus)
        ? { $in: filters.jobApplicationStatus }
        : filters.jobApplicationStatus;
    }
    if (filters?.fromDate || filters?.toDate) {
      queryFilter.createdAt = {
        ...(filters.fromDate ? { $gte: filters.fromDate } : {}),
        ...(filters.toDate ? { $lte: filters.toDate } : {}),
      };
    }

    const queryOptions: any = {
      page: options.pagination?.page || 1,
      limit: options.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: options.sort || { createdAt: -1 }
    };
    
    const result = await this.jobApplicationModel.paginate(queryFilter, queryOptions);
    return result;
  }


  async getJobApplications(
    query: GetJobApplicationsQuery,
    options: CommonQueryOptions
  ): Promise<JobApplication[]> {
    
    const { filters } = query;
    checkId([filters?.sellerId, filters?.employeeId]);

    const queryFilter: any = {};
    if (filters?.sellerId) queryFilter.sellerId = new Types.ObjectId(filters.sellerId);
    if (filters?.employeeId) queryFilter.employeeId = new Types.ObjectId(filters.employeeId);
    
    if (filters?.jobApplicationStatus) {
      queryFilter.jobApplicationStatus = Array.isArray(filters.jobApplicationStatus)
        ? { $in: filters.jobApplicationStatus }
        : filters.jobApplicationStatus;
    }
    if (filters?.fromDate || filters?.toDate) {
      queryFilter.createdAt = {
        ...(filters.fromDate ? { $gte: filters.fromDate } : {}),
        ...(filters.toDate ? { $lte: filters.toDate } : {}),
      };
    }

    const dbQuery = this.jobApplicationModel.find(queryFilter).sort({ createdAt: -1 });
    if (options.session) dbQuery.session(options.session);
    
    const jobApplications = await dbQuery.lean({ virtuals: true }).exec();
    return jobApplications;
  }


  async createJobApplication(
    command: CreateJobApplicationCommand,
    options: CommonCommandOptions
  ): Promise<JobApplication> {
    const { sellerId, payload } = command;

    checkId([sellerId]);
    const phoneNumber = parcePhoneNumber(payload.employeePhoneNumber);
    if (!phoneNumber || !phoneNumber.isValid) throw new DomainError({ code: 'VALIDATION', message: 'Неверный формат номера телефона' });

    // Получаем продавца через Port
    const seller = await this.sellerPort.getSeller(sellerId, options);
    if (!seller) throw new DomainError({ code: 'NOT_FOUND', message: 'Продавец не найден' });

    // Получаем сотрудника по телефону через Port
    const employee = await this.employeePort.getEmployee({ phoneNumber: phoneNumber.number }, options);
    if (!employee) throw new DomainError({ code: 'NOT_FOUND', message: 'Сотрудник не найден' });

    // Бизнес-правило: сотрудник не должен быть занят
    if (employee.employer) throw new DomainError({ code: 'CONFLICT', message: 'Сотрудник уже работает у другого продавца' });

    // Проверяем дубликаты
    const existingQuery = this.jobApplicationModel.findOne({
      sellerId: new Types.ObjectId(seller.sellerId),
      employeeId: new Types.ObjectId(employee.employeeId),
      jobApplicationStatus: JobApplicationStatus.PENDING
    });
    if (options.session) existingQuery.session(options.session);
    
    const existing = await existingQuery.exec();
    if (existing) throw new DomainError({ code: 'CONFLICT', message: 'Запрос уже отправлен' });

    // Создаем заявку

    const jobApplicationData: Omit<JobApplication, '_id' | 'jobApplicationId' | 'createdAt' | 'updatedAt'> = {
      sellerId: new Types.ObjectId(sellerId),
      employeeId: employee._id,
      employeeName: employee.employeeName,
      employeePhoneNumber: employee.phoneNumber,
      companyName: seller.companyName,
      jobApplicationStatus: JobApplicationStatus.PENDING
    };

    const queryOptions: any = {};
    if (options?.session) queryOptions.session = options.session;

    const jobApplication = await this.jobApplicationModel.create([jobApplicationData], queryOptions).then(docs => docs[0]);
    return jobApplication;
  }


  async updateJobApplication(
    command: UpdateJobApplicationCommand,
    options: CommonCommandOptions
  ): Promise<JobApplication> {

    const { jobApplicationId, payload } = command;
    checkId([jobApplicationId]);

    const dbQuery = this.jobApplicationModel.findOne({ _id: new Types.ObjectId(jobApplicationId) });
    if (options.session) dbQuery.session(options.session);
    
    const jobApplication = await dbQuery.exec();
    if (!jobApplication) throw new DomainError({ code: 'NOT_FOUND', message: 'Заявка не найдена' });
    
    assignField(jobApplication, 'jobApplicationStatus', payload.jobApplicationStatus, { onNull: 'skip' });

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;

    await jobApplication.save(saveOptions);
    return jobApplication;
  }


  async deleteJobApplication(
    jobApplicationId: string,
    options: CommonCommandOptions
  ): Promise<JobApplication> {
    
    checkId([jobApplicationId]);

    const dbQuery = this.jobApplicationModel.findOne({ _id: new Types.ObjectId(jobApplicationId) });
    if (options.session) dbQuery.session(options.session);
    
    const jobApplication = await dbQuery.exec();
    if (!jobApplication) throw new DomainError({ code: 'NOT_FOUND', message: 'Заявка не найдена' });
    
    const deleteOptions: any = {};
    if (options.session) deleteOptions.session = options.session;

    await jobApplication.deleteOne(deleteOptions);
    return jobApplication;
  }
}