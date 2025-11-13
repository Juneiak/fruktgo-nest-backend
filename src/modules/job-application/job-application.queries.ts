import { JobApplicationStatus } from "./job-application.enums";
import { JobApplication } from "./job-application.schema";

export class GetJobApplicationsQuery {
  constructor(
    public readonly filters?: {
      sellerId?: string;
      employeeId?: string;
      statuses?: JobApplicationStatus[];
      fromDate?: Date;
      toDate?: Date;
    },
    public readonly options?: {
      select?: (keyof JobApplication)[]
    }
  ) {}
}

export class GetJobApplicationQuery {
  constructor(
    public readonly jobApplicationId: string,
    public readonly options?: {
      select?: (keyof JobApplication)[]
    }
  ) {}
}