import { RouterModule } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { AdminAuthApiModule } from "./auth/admin.auth.api.module";
import { AdminArticlesApiModule } from "./articles/admin.articles.api.module";
import { AdminOrdersApiModule } from "./orders/admin.orders.api.module";
import { AdminPlatformApiModule } from "./platform/admin.platform.api.module";
import { AdminProductsApiModule } from "./products/admin.products.api.module";
import { AdminSellersApiModule } from "./sellers/admin.sellers.api.module";
import { AdminCustomersApiModule } from "./customers/admin.customers.api.module";
import { AdminEmployeesApiModule } from "./employees/admin.employees.api.module";
import { AdminShopProductsApiModule } from "./shop-products/admin.shop-products.api.module";
import { AdminShopsApiModule } from "./shops/admin.shops.api.module";
import { AdminIssuesApiModule } from "./issues/admin.issues.api.module";
import { AdminShiftsApiModule } from "./shifts/admin.shifts.api.module";

@Module({
  imports: [
    RouterModule.register([
      { path: 'auth', module: AdminAuthApiModule },
      { path: 'articles', module: AdminArticlesApiModule },
      { path: 'customers', module: AdminCustomersApiModule },
      { path: 'employees', module: AdminEmployeesApiModule },
      { path: 'orders', module: AdminOrdersApiModule },
      { path: 'platform', module: AdminPlatformApiModule },
      { path: 'products', module: AdminProductsApiModule },
      { path: 'sellers', module: AdminSellersApiModule },
      { path: 'shop-products', module: AdminShopProductsApiModule },
      { path: 'shops', module: AdminShopsApiModule },
      { path: 'issues', module: AdminIssuesApiModule },
      { path: 'shifts', module: AdminShiftsApiModule },
    ]),
  ],
})
export class AdminApiModule {}