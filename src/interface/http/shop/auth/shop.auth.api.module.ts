import { Module } from "@nestjs/common";
import { ShopAuthRoleService } from "./shop.auth.role.service";
import { ShopAuthController } from "./shop.auth.controller";

@Module({
  controllers: [ShopAuthController],
  providers: [ShopAuthRoleService],
})
export class ShopAuthApiModule {}