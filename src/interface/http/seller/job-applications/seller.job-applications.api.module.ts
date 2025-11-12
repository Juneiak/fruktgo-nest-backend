import { Module } from "@nestjs/common";
import { SellerJobApplicationsRoleService } from "./seller.job-applications.role.service";
import { SellerJobApplicationsController } from "./seller.job-applications.controller";

@Module({
  controllers: [SellerJobApplicationsController],
  providers: [SellerJobApplicationsRoleService],
})
export class SellerJobApplicationsApiModule {}
