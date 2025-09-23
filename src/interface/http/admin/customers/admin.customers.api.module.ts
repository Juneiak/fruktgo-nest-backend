
import { Module } from "@nestjs/common";
import { AdminCustomersRoleService } from "./admin.customers.role.service";
import { AdminCustomersController } from "./admin.customers.controller";

@Module({
  controllers: [AdminCustomersController],
  providers: [AdminCustomersRoleService],
})
export class AdminCustomersApiModule {}