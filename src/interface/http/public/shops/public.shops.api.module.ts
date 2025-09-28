import { Module } from "@nestjs/common";
import { PublicShopsRoleService } from "./public.shops.role.service";
import { PublicShopsController } from "./public.shops.controller";

@Module({
  controllers: [PublicShopsController],
  providers: [PublicShopsRoleService],
})
export class PublicShopsApiModule {}