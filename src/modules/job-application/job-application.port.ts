import { CommonCommandOptions } from 'src/common/types/commands';
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
  // QUERIES
  // ==================================================== 
  getPaginatedJobApplications(query: GetJobApplicationsQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<JobApplication>>;
  getJobApplications(query: GetJobApplicationsQuery, queryOptions?: CommonQueryOptions): Promise<JobApplication[]>;


  // ====================================================
  // COMMANDS
  // ==================================================== 
  createJobApplication(command: CreateJobApplicationCommand, commandOptions?: CommonCommandOptions): Promise<JobApplication>;
  updateJobApplication(command: UpdateJobApplicationCommand, commandOptions?: CommonCommandOptions): Promise<JobApplication>;
  deleteJobApplication(jobApplicationId: string, commandOptions?: CommonCommandOptions): Promise<JobApplication>;
}

export const JOB_APPLICATION_PORT = Symbol('JOB_APPLICATION_PORT');
