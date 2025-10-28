import { JobApplicationStatus } from "./job-application.enums";

export class CreateJobApplicationCommand {
  constructor(
    public readonly payload: {
      sellerId: string;
      employeeId: string;
    },
    public readonly jobApplicationId?: string
  ) {}
}

export class UpdateJobApplicationCommand {
  constructor(
    public readonly jobApplicationId: string,
    public readonly payload: {
      status: JobApplicationStatus;
    }
  ) {}
}