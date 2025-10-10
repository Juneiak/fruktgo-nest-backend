import { JobApplicationStatus } from "./job-application.enums";

export type GetJobApplicationsFilters = {
  requestStatus?: JobApplicationStatus | JobApplicationStatus[],
  fromDate?: Date,
  toDate?: Date,
};

export class GetJobApplicationsQuery {
  constructor(
    public readonly sellerId?: string,
    public readonly employeeId?: string,
    public readonly filters?: GetJobApplicationsFilters,
  ) {}
}