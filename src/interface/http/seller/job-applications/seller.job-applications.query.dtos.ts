import { IsOptional, IsEnum, IsDate } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { JobApplicationEnums } from 'src/modules/job-application';

export class JobApplicationQueryFilterDto {
  @IsOptional()
  @IsEnum(JobApplicationEnums.JobApplicationStatus, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value];
    return value;
  })
  statuses?: JobApplicationEnums.JobApplicationStatus[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;
}
