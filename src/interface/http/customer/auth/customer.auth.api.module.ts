import { Module } from "@nestjs/common";
import { CustomerAuthRoleService } from "./customer.auth.role.service";
import { CustomerAuthController } from "./customer.auth.controller";

@Module({
  controllers: [CustomerAuthController],
  providers: [CustomerAuthRoleService],
})
export class CustomerAuthApiModule {}