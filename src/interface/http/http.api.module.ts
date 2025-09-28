import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { AdminApiModule } from './admin/admin.api.module';

import { SellerApiModule } from './seller/seller.api.module';
import { CustomerApiModule } from './customer/customer.api.module';
import { PublicApiModule } from './public/public.api.module';
import { EmployeeApiModule } from './employee/employee.api.module';
import { ShopApiModule } from './shop/shop.api.module'

@Module({
  imports: [
    AdminApiModule,
    RouterModule.register([
      { path: 'admin',  module: AdminApiModule },
      { path: 'shop',  module: ShopApiModule },
      { path: 'seller',  module: SellerApiModule },
      { path: 'customer',  module: CustomerApiModule },
      { path: 'public',  module: PublicApiModule },
      { path: 'employee',  module: EmployeeApiModule },
    ]),
  ],
})
export class HttpApiModule {}