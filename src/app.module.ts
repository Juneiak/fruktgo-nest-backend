import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CustomerAuthModule } from './modules/auth/customer-auth/customer-auth.module';
import { SellerAuthModule } from './modules/auth/seller-auth/seller-auth.module';
import { EmployeeAuthModule } from './modules/auth/employee-auth/employee-auth.module';

import { CommonModule } from './common/common.module';

import { CustomerModule } from './modules/customer/customer.module'
import { ShopModule } from './modules/shop/shop/shop.module';
import { SellerModule } from './modules/seller/seller.module';
import { ProductModule } from './modules/product/product.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { OrderModule } from './modules/order/order.module';

import { AdminAuthModule } from './modules/auth/admin-auth/admin-auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { SupportModule } from './modules/support/support.module';

import { BlogModule } from './modules/blog/blog.module';
import { DadataModule } from './modules/dadata/dadata.module';
import { FinanceModule } from './modules/finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Загружаем .env
    MongooseModule.forRoot(process.env.MONGO_URI ?? ''),
    CacheModule.register({ isGlobal: true, ttl: 300 }), // 5 минут глобальный кэш
    CommonModule,

    AdminModule,
    CustomerAuthModule,
    SellerAuthModule,
    EmployeeAuthModule,
    AdminAuthModule,

    CustomerModule,
    ShopModule,
    SellerModule,
    ProductModule,
    EmployeeModule,
    OrderModule,
    SupportModule,
    BlogModule,
    DadataModule,
    FinanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {};