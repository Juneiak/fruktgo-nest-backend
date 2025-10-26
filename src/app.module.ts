import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { CustomerAuthModule } from './modules/auth/customer-auth/customer-auth.module';
import { SellerAuthModule } from './modules/auth/seller-auth/seller-auth.module';
import { EmployeeAuthModule } from './modules/auth/employee-auth/employee-auth.module';

import { CustomerModule } from './modules/customer/customer.module'
import { ShopModule } from './modules/shop/shop/shop.module';
import { SellerModule } from './modules/seller/seller.module';
import { ProductModule } from './modules/product/product.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { OrderModule } from './modules/order/order.module';

import { AdminAuthModule } from './modules/auth/admin-auth/admin-auth.module';
import { AdminModule } from './modules/platform/platform.module';
import { SupportModule } from './modules/issue/support.module';

import { BlogModule } from './modules/article/blog.module';
import { DadataModule } from './interface/http/public/dadata/public.dadata.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AuthModule } from './infra/auth/auth.module';
import { LogsModule } from './infra/logs/log.module';
import { UploadsModule } from './infra/images/images.module';

import { HttpApiModule } from './interface/http/http.api.module';
import { WsModule } from './interface/ws/ws.module';


import { APP_FILTER } from '@nestjs/core';
import { DomainErrorFilter } from 'src/common/errors/domain-error.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Загружаем .env
    MongooseModule.forRoot(process.env.MONGO_URI ?? ''),
    CacheModule.register({ isGlobal: true, ttl: 300 }), // 5 минут глобальный кэш
    EventEmitterModule.forRoot(),


    AuthModule,
    LogsModule,
    UploadsModule,

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


    HttpApiModule,
    WsModule
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainErrorFilter }
  ],
})
export class AppModule {};