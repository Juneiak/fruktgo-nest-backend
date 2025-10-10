import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { JobApplication } from './job-application.schema';
import { PaginateResult } from 'mongoose';
import {
  CreateJobApplicationCommand,
  UpdateJobApplicationCommand
} from './job-application.commands';
import { GetJobApplicationsQuery } from './job-application.queries';

export interface JobApplicationPort {

  // ====================================================
  // COMMANDS
  // ==================================================== 
  createJobApplication(command: CreateJobApplicationCommand, options: CommonCommandOptions): Promise<JobApplication>;
  updateJobApplication(command: UpdateJobApplicationCommand, options: CommonCommandOptions): Promise<JobApplication>;
  deleteJobApplication(jobApplicationId: string, options: CommonCommandOptions): Promise<JobApplication>;

  // ====================================================
  // QUERIES
  // ==================================================== 
  getPaginatedJobApplications(query: GetJobApplicationsQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<JobApplication>>;
  getJobApplications(query: GetJobApplicationsQuery, options: CommonQueryOptions): Promise<JobApplication[]>;
}

export const JOB_APPLICATION_PORT = Symbol('JOB_APPLICATION_PORT');
