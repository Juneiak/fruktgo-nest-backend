import { Module } from "@nestjs/common";
import { AdminProductsController } from "./admin.products.controller";
import { AdminProductsRoleService } from "./admin.products.role.service";
import { ProductModule } from "src/modules/product/product.module";

@Module({
  imports: [ProductModule],
  controllers: [AdminProductsController],
  providers: [AdminProductsRoleService],
})
export class AdminProductsApiModule {}