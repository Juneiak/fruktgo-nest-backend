import { Module } from "@nestjs/common";
import { ShopMeRoleService } from "./shop.me.role.service";
import { ShopMeController } from "./shop.me.controller";
import { ShopModule } from "src/modules/shop/shop.module";

@Module({
  imports: [ShopModule],
  controllers: [ShopMeController],
  providers: [ShopMeRoleService],
})
export class ShopMeApiModule {}