import { Module } from "@nestjs/common";
import { PublicShopsRoleService } from "./public.shops.role.service";
import { PublicShopsController } from "./public.shops.controller";
import { ShopModule } from "src/modules/shop/shop.module";

@Module({
  imports: [ShopModule],
  controllers: [PublicShopsController],
  providers: [PublicShopsRoleService],
})
export class PublicShopsApiModule {}