import { JobApplicationStatus } from "./job-application.enums";

export class GetJobApplicationsQuery {
  constructor(
    public readonly filters?: {
      sellerId?: string;
      employeeId?: string;
      statuses?: JobApplicationStatus[];
      fromDate?: Date;
      toDate?: Date;
    },
  ) {}
}