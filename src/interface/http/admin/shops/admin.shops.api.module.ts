import { Module } from "@nestjs/common";
import { AdminShopsRoleService } from "./admin.shops.role.service";
import { AdminShopsController } from "./admin.shops.controller";
import { ShopModule } from "src/modules/shop/shop.module";

@Module({
  imports: [ShopModule],
  controllers: [AdminShopsController],
  providers: [AdminShopsRoleService],
})
export class AdminShopsApiModule {}