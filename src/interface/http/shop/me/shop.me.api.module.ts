import { Module } from "@nestjs/common";
import { ShopMeRoleService } from "./shop.me.role.service";
import { ShopMeController } from "./shop.me.controller";

@Module({
  controllers: [ShopMeController],
  providers: [ShopMeRoleService],
})
export class ShopMeApiModule {}