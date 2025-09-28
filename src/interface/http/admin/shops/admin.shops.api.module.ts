import { Module } from "@nestjs/common";
import { AdminShopsRoleService } from "./admin.shops.role.service";
import { AdminShopsController } from "./admin.shops.controller";

@Module({
  controllers: [AdminShopsController],
  providers: [AdminShopsRoleService],
})
export class AdminShopsApiModule {}