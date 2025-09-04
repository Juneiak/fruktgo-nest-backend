import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TypeGuard } from './guards/type.guard';

import { ProductSchema } from 'src/modules/product/product.schema';
import { OrderSchema } from 'src/modules/order/order.schema';
import { ShopSchema } from 'src/modules/shop/shop/shop.schema';
import { EmployeeSchema } from 'src/modules/employee/employee.schema';
import { RequestToEmployeeSchema } from 'src/modules/employee/request-to-employee.schema';
import { ShiftSchema } from 'src/modules/shop/shift/shift.schema';
import { ShopProductSchema } from 'src/modules/shop/shop-product/shop-product.schema';
import { CartSchema } from 'src/modules/customer/schemas/cart.schema';
import { CustomerSchema } from 'src/modules/customer/schemas/customer.schema';
import { SellerSchema } from 'src/modules/seller/seller.schema';
import { AdminSchema } from 'src/modules/admin/admin.schema';
import { UploadsModule } from './modules/uploads/uploads.module';
import { EmployeeAuthGuard } from './guards/employee-auth.guard';
import { LogsModule } from './modules/logs/logs.module';
import { IssueSchema } from 'src/modules/support/issue.schema';
import { UploadedFileSchema } from 'src/common/modules/uploads/uploaded-file.schema';
import { SellerAccountSchema } from 'src/modules/finance/seller-account/schemas/seller-account.schema';

@Global()
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    MongooseModule.forFeature([
      { name: 'Product', schema: ProductSchema },
      { name: 'ShopProduct', schema: ShopProductSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'Shop', schema: ShopSchema },
      { name: 'Employee', schema: EmployeeSchema },
      { name: 'RequestToEmployee', schema: RequestToEmployeeSchema },
      { name: 'Shift', schema: ShiftSchema },
      { name: 'Cart', schema: CartSchema },
      { name: 'Customer', schema: CustomerSchema },
      { name: 'Seller', schema: SellerSchema },
      { name: 'Admin', schema: AdminSchema },
      { name: 'Issue', schema: IssueSchema },
      { name: 'UploadedFile', schema: UploadedFileSchema },
      { name: 'SellerAccount', schema: SellerAccountSchema },
    ]),
    UploadsModule,
    LogsModule,
  ],
  providers: [JwtStrategy, JwtAuthGuard, TypeGuard, EmployeeAuthGuard],
  exports: [
    JwtAuthGuard,
    TypeGuard,
    JwtModule,
    PassportModule,
    MongooseModule,
    EmployeeAuthGuard,
    UploadsModule,
    LogsModule,
  ],
})
export class CommonModule {}