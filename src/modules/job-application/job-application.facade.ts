import { Injectable } from '@nestjs/common';
import { JobApplicationPort } from './job-application.port';
import { JobApplicationService } from './job-application.service';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { JobApplication } from './job-application.schema';
import { PaginateResult } from 'mongoose';
import {
  CreateJobApplicationCommand,
  UpdateJobApplicationCommand
} from './job-application.commands';
import { GetJobApplicationsQuery } from './job-application.queries';

@Injectable()
export class JobApplicationFacade implements JobApplicationPort {
  constructor(private readonly jobApplicationService: JobApplicationService) {}

  // ====================================================
  // COMMANDS
  // ====================================================
  async createJobApplication(command: CreateJobApplicationCommand, options: CommonCommandOptions): Promise<JobApplication> {
    return this.jobApplicationService.createJobApplication(command, options);
  }

  async updateJobApplication(command: UpdateJobApplicationCommand, options: CommonCommandOptions): Promise<JobApplication> {
    return this.jobApplicationService.updateJobApplication(command, options);
  }

  async deleteJobApplication(jobApplicationId: string, options: CommonCommandOptions): Promise<JobApplication> {
    return this.jobApplicationService.deleteJobApplication(jobApplicationId, options);
  }

  // ====================================================
  // QUERIES
  // ====================================================
  async getPaginatedJobApplications(query: GetJobApplicationsQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<JobApplication>> {
    return this.jobApplicationService.getPaginatedJobApplications(query, options);
  }

  async getJobApplications(query: GetJobApplicationsQuery, options: CommonQueryOptions): Promise<JobApplication[]> {
    return this.jobApplicationService.getJobApplications(query, options);
  }
}