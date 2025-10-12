import { JobApplicationStatus } from "./job-application.enums";

export type GetJobApplicationsFilters = {
  sellerId?: string;
  employeeId?: string;
  jobApplicationStatus?: JobApplicationStatus | JobApplicationStatus[];
  fromDate?: Date;
  toDate?: Date;
};

export class GetJobApplicationsQuery {
  constructor(
    public readonly filters?: GetJobApplicationsFilters,
  ) {}
}