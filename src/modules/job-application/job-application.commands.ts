import { JobApplicationStatus } from "./job-application.enums";

export type CreateJobApplicationPayload = {
  employeePhoneNumber: string;
}

export class CreateJobApplicationCommand {
  constructor(
    public readonly sellerId: string,
    public readonly payload: CreateJobApplicationPayload
  ) {}
}

export type UpdateJobApplicationPayload = {
  jobApplicationStatus: JobApplicationStatus;
}

export class UpdateJobApplicationCommand {
  constructor(
    public readonly jobApplicationId: string,
    public readonly payload: UpdateJobApplicationPayload
  ) {}
}