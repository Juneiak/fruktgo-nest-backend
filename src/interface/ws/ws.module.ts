import { Module } from '@nestjs/common';

import { AdminAuthGateway } from './admin/auth/admin.auth.gateway';
import { ShopAuthGateway } from './shop/auth/shop.auth.gateway';
import { CustomerAuthGateway } from './customer/auth/customer.auth.gateway';
import { EmployeeAuthGateway } from './employee/auth/employee.auth.gateway';
import { SellerAuthGateway } from './seller/auth/seller.auth.gateway';


@Module({
  providers: [AdminAuthGateway, ShopAuthGateway, CustomerAuthGateway, EmployeeAuthGateway, SellerAuthGateway],
  exports: [AdminAuthGateway, ShopAuthGateway, CustomerAuthGateway, EmployeeAuthGateway, SellerAuthGateway],
})
export class WsModule {}