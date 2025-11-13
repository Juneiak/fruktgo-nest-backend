import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Seller } from 'src/modules/seller/seller.schema';
import { Shop } from 'src/modules/shop/shop.schema';
import { Product } from 'src/modules/product/product.schema';
import { Shift } from 'src/modules/shift/shift.schema';
import { checkId, selectFields } from 'src/common/utils';
import { Order } from 'src/modules/order/order.schema';
import { Address } from 'src/infra/addresses';
import { AccessPort } from './access.port';

@Injectable()
export class AccessService implements AccessPort {
  constructor(
    @InjectModel(Shop.name) private readonly shopModel: Model<Shop>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Shift.name) private readonly shiftModel: Model<Shift>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Address.name) private readonly addressModel: Model<Address>,
  ) {}

  // ========== Seller Access Checks ==========

  async canSellerAccessShop(sellerId: string, shopId: string): Promise<boolean> {
    try {
      checkId([sellerId, shopId]);

      const exists = await this.shopModel.exists({
        _id: new Types.ObjectId(shopId),
        owner: new Types.ObjectId(sellerId),
      });

      return !!exists;
    } catch (error) {
      return false;
    }
  }

  async canSellerAccessProduct(sellerId: string, productId: string): Promise<boolean> {
    try {
      checkId([sellerId, productId]);

      const exists = await this.productModel.exists({
        owner: new Types.ObjectId(sellerId),
        _id: new Types.ObjectId(productId),
      });

      return !!exists;
    } catch (error) {
      return false;
    }
  }

  async canSellerAccessShift(sellerId: string, shiftId: string): Promise<boolean> {
    try {
      checkId([sellerId, shiftId]);

      const shift = await this.shiftModel
        .findById(shiftId)
        .select(selectFields<Shift>('shop'))
        .lean()
        .exec();
      
      if (!shift) return false;

      const exists = await this.shopModel.exists({
        _id: shift.shop,
        owner: new Types.ObjectId(sellerId),
      });

      return !!exists;
    } catch (error) {
      return false;
    }
  }

  async canSellerAccessShops(sellerId: string, shopIds: string[]): Promise<boolean> {
    try {
      if (!shopIds || shopIds.length === 0) return true;

      checkId([sellerId, ...shopIds]);

      const count = await this.shopModel.countDocuments({
        _id: { $in: shopIds.map(id => new Types.ObjectId(id)) },
        owner: new Types.ObjectId(sellerId),
      });

      return count === shopIds.length;
    } catch (error) {
      return false;
    }
  }

  // ========== Shop Access Checks ==========

  async canShopAccessShift(shopId: string, shiftId: string): Promise<boolean> {
    try {
      checkId([shopId, shiftId]);

      const exists = await this.shiftModel.exists({
        _id: new Types.ObjectId(shiftId),
        shop: new Types.ObjectId(shopId),
      });

      return !!exists;
    } catch (error) {
      return false;
    }
  }

  async canShopAccessProduct(shopId: string, productId: string): Promise<boolean> {
    try {
      checkId([shopId, productId]);

      const exists = await this.productModel.exists({
        _id: new Types.ObjectId(productId),
        shop: new Types.ObjectId(shopId),
      });

      return !!exists;
    } catch (error) {
      return false;
    }
  }

  // ========== Customer Access Checks ==========

  async canCustomerAccessOrder(customerId: string, orderId: string): Promise<boolean> {
    try {
      checkId([customerId, orderId]);

      const exists = await this.orderModel.exists({
        _id: new Types.ObjectId(orderId),
        customer: new Types.ObjectId(customerId),
      });

      return !!exists;
    } catch (error) {
      return false;
    }
  }

  async canCustomerAccessAddress(customerId: string, addressId: string): Promise<boolean> {
    try {
      checkId([customerId, addressId]);

      const exists = await this.addressModel.exists({
        _id: new Types.ObjectId(addressId),
        entityId: new Types.ObjectId(customerId),
        entityType: 'customer',
      });

      return !!exists;
    } catch (error) {
      return false;
    }
  }

  // ========== Helper Methods ==========

  async getShopIfSellerHasAccess(sellerId: string, shopId: string): Promise<any | null> {
    try {
      checkId([sellerId, shopId]);

      const shop = await this.shopModel
        .findOne({
          _id: new Types.ObjectId(shopId),
          owner: new Types.ObjectId(sellerId),
        })
        .lean({ virtuals: true })
        .exec();

      return shop;
    } catch (error) {
      return null;
    }
  }

  async getProductIfSellerHasAccess(sellerId: string, productId: string): Promise<any | null> {
    try {
      checkId([sellerId, productId]);

      const product = await this.productModel
        .findById(new Types.ObjectId(productId))
        .lean({ virtuals: true })
        .exec() as any;

      if (!product) return null;

      const hasAccess = await this.canSellerAccessShop(sellerId, product.shop.toString());
      if (!hasAccess) return null;

      return product;
    } catch (error) {
      return null;
    }
  }

  async getShiftIfSellerHasAccess(sellerId: string, shiftId: string): Promise<any | null> {
    try {
      checkId([sellerId, shiftId]);

      const shift = await this.shiftModel
        .findById(new Types.ObjectId(shiftId))
        .lean({ virtuals: true })
        .exec() as any;

      if (!shift) return null;

      const hasAccess = await this.canSellerAccessShop(sellerId, shift.shop.toString());
      if (!hasAccess) return null;

      return shift;
    } catch (error) {
      return null;
    }
  }

  async getOrderIfCustomerHasAccess(customerId: string, orderId: string): Promise<any | null> {
    try {
      checkId([customerId, orderId]);

      const order = await this.orderModel
        .findOne({
          _id: new Types.ObjectId(orderId),
          customer: new Types.ObjectId(customerId),
        })
        .lean({ virtuals: true })
        .exec();

      return order;
    } catch (error) {
      return null;
    }
  }
}
