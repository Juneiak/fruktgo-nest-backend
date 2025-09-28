import { Module } from "@nestjs/common";
import { AdminPlatformRoleService } from "./admin.platform.role.service";
import { AdminPlatformController } from "./admin.platform.controller";

@Module({
  controllers: [AdminPlatformController],
  providers: [AdminPlatformRoleService],
})
export class AdminPlatformApiModule {}