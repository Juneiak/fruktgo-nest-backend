import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessService } from './access.service';
import { ACCESS_PORT } from './access.port';
import { Shop, ShopSchema } from 'src/modules/shop/shop.schema';
import { Product, ProductSchema } from 'src/modules/product/product.schema';
import { Shift, ShiftSchema } from 'src/modules/shift/shift.schema';
import { Order, OrderSchema } from 'src/modules/order/order.schema';
import { Address, AddressSchema } from 'src/infra/addresses/address.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shop.name, schema: ShopSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Address.name, schema: AddressSchema },
    ]),
  ],
  providers: [
    {
      provide: ACCESS_PORT,
      useClass: AccessService,
    },
  ],
  exports: [ACCESS_PORT],
})
export class AccessModule {}
