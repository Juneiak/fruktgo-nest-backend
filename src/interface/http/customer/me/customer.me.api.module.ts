import { Module } from "@nestjs/common";
import { CustomerMeController } from "./customer.me.controller";
import { CustomerMeRoleService } from "./customer.me.role.service";

@Module({
  controllers: [CustomerMeController],
  providers: [CustomerMeRoleService],
})
export class CustomerMeApiModule {}