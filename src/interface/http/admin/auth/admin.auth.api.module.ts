import { Module } from "@nestjs/common";
import { AdminAuthController } from "./admin.auth.controller";
import { AdminAuthRoleService } from "./admin.auth.role.service";

@Module({
  controllers: [AdminAuthController],
  providers: [AdminAuthRoleService],
})
export class AdminAuthApiModule {}