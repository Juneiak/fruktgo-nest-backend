import { Module } from "@nestjs/common";
import { CustomerMeController } from "./customer.me.controller";
import { CustomerMeRoleService } from "./customer.me.role.service";
import { CustomerModule } from "src/modules/customer/customer.module";
import { AddressesModule } from "src/infra/addresses/addresses.module";

@Module({
  imports: [
    CustomerModule,
  ],
  controllers: [CustomerMeController],
  providers: [CustomerMeRoleService],
})
export class CustomerMeApiModule {}