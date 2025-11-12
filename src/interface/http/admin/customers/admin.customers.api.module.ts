import { Module } from "@nestjs/common";
import { AdminCustomersRoleService } from "./admin.customers.role.service";
import { AdminCustomersController } from "./admin.customers.controller";
import { CustomerModule } from "src/modules/customer";

@Module({
  imports: [
    CustomerModule
  ],
  controllers: [AdminCustomersController],
  providers: [AdminCustomersRoleService],
})
export class AdminCustomersApiModule {}