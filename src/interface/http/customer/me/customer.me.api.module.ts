import { CustomerMeController } from "./customer.me.controller";
import { Module } from "@nestjs/common";
import { CustomerMeRoleService } from "./customer.me.role.service";

@Module({
  imports: [],
  controllers: [CustomerMeController],
  providers: [CustomerMeRoleService],
})
export class CustomerMeApiModule {}