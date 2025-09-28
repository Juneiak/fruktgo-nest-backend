import { Module } from "@nestjs/common";
import { AdminOrdersRoleService } from "./admin.orders.role.service";
import { AdminOrdersController } from "./admin.orders.controller";

@Module({
  controllers: [AdminOrdersController],
  providers: [AdminOrdersRoleService],
})
export class AdminOrdersApiModule {}