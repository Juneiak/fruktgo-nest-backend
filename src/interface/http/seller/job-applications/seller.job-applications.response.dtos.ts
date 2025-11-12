import { Expose, Type } from 'class-transformer';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { JobApplicationEnums } from 'src/modules/job-application';

class JobApplicationEmployeeDto {
  @ExposeObjectId() employeeId: string;
  @Expose() employeeName: string;
  @Expose() employeePhone: string;
}

class JobApplicationSellerDto {
  @ExposeObjectId() sellerId: string;
  @Expose() sellerCompanyName: string;
}

export class JobApplicationResponseDto {
  @Expose() jobApplicationId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() @Type(() => JobApplicationEmployeeDto) employee: JobApplicationEmployeeDto;
  @Expose() @Type(() => JobApplicationSellerDto) seller: JobApplicationSellerDto;
  @Expose() status: JobApplicationEnums.JobApplicationStatus;
}
