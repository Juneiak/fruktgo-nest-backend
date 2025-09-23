import { AdminProductsController } from "./admin.products.controller";
import { Module } from "@nestjs/common";
import { AdminProductsRoleService } from "./admin.products.role.service";

@Module({
  imports: [],
  controllers: [AdminProductsController],
  providers: [AdminProductsRoleService],
})
export class AdminProductsApiModule {}