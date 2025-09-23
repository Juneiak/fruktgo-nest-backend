import { AdminSellersApiModule } from "./sellers/admin.sellers.api.module";
import { AdminProductsApiModule } from './products/admin.products.api.module';
import { RouterModule } from "@nestjs/core";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    RouterModule.register([
      { path: 'sellers', module: AdminSellersApiModule },
      { path: 'products', module: AdminProductsApiModule },
    ]),
  ],
})
export class AdminApiModule {}