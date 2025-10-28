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
  // QUERIES
  // ====================================================
  async getPaginatedJobApplications(
    query: GetJobApplicationsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<JobApplication>> {
    return this.jobApplicationService.getPaginatedJobApplications(query, queryOptions);
  }

  async getJobApplications(
    query: GetJobApplicationsQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<JobApplication[]> {
    return this.jobApplicationService.getJobApplications(query, queryOptions);
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createJobApplication(
    command: CreateJobApplicationCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<JobApplication> {
    return this.jobApplicationService.createJobApplication(command, commandOptions);
  }

  async updateJobApplication(
    command: UpdateJobApplicationCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<JobApplication> {
    return this.jobApplicationService.updateJobApplication(command, commandOptions);
  }

  async deleteJobApplication(
    jobApplicationId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<JobApplication> {
    return this.jobApplicationService.deleteJobApplication(jobApplicationId, commandOptions);
  }
}