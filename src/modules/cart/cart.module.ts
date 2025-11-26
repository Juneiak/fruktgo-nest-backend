import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './cart.schema';
import { CartService } from './cart.service';
import { CART_PORT } from './cart.port';
import { ShopModule } from 'src/modules/shop';
import { ShopProductModule } from 'src/modules/shop-product';
import { ShiftModule } from 'src/modules/shift';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    ShopModule,
    ShopProductModule,
    ShiftModule,
  ],
  providers: [
    CartService,
    { provide: CART_PORT, useExisting: CartService },
  ],
  exports: [CART_PORT],
})
export class CartModule {}
