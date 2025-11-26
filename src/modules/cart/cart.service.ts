import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonQueryOptions } from 'src/common/types/queries';
import { DomainError } from 'src/common/errors';
import { checkId } from 'src/common/utils';
import { Cart, CartModel } from './cart.schema';
import { CartPort } from './cart.port';
import { CartStatus } from './cart.enums';
import {
  SelectShopCommand,
  UnselectShopCommand,
  AddProductCommand,
  UpdateProductQuantityCommand,
  RemoveProductCommand,
  SetDeliveryCommand,
  ClearCartCommand,
  CreateCartCommand,
} from './cart.commands';
import { GetCartQuery, ValidateCartQuery } from './cart.queries';
import { CartValidationResult, CartValidationError } from './cart.results';
import {
  ShopProductPort,
  SHOP_PRODUCT_PORT,
  ShopProductQueries,
} from 'src/modules/shop-product';
import {
  ShopPort,
  SHOP_PORT,
  ShopEnums,
} from 'src/modules/shop';
import {
  ShiftPort,
  SHIFT_PORT,
  ShiftEnums,
} from 'src/modules/shift';

@Injectable()
export class CartService implements CartPort {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: CartModel,
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort,
    @Inject(SHOP_PRODUCT_PORT) private readonly shopProductPort: ShopProductPort,
    @Inject(SHIFT_PORT) private readonly shiftPort: ShiftPort,
  ) {}

  // ====================================================
  // QUERIES
  // ====================================================

  async getCart(
    query: GetCartQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Cart | null> {
    const { customerId, options } = query;
    checkId([customerId]);

    const dbQuery = this.cartModel.findOne({ customer: new Types.ObjectId(customerId) });
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    if (options?.populateShop) {
      dbQuery.populate('selectedShop');
    }

    if (options?.populateProducts) {
      dbQuery.populate({
        path: 'products.shopProduct',
        populate: { path: 'product' },
      });
    }

    const cart = await dbQuery.lean({ virtuals: true }).exec();
    return cart;
  }

  async validateCart(
    query: ValidateCartQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<CartValidationResult> {
    const { customerId } = query;
    checkId([customerId]);

    const errors: CartValidationError[] = [];

    // Get cart with products populated
    const cart = await this.getCart(
      new GetCartQuery(customerId, { populateProducts: true, populateShop: true }),
      queryOptions
    );

    if (!cart) {
      return {
        isValid: false,
        status: CartStatus.EMPTY,
        errors: [{ code: 'CART_NOT_FOUND', message: 'Корзина не найдена' }],
      };
    }

    // Check if cart is empty
    if (!cart.products || cart.products.length === 0) {
      return {
        isValid: false,
        status: CartStatus.EMPTY,
        errors: [{ code: 'CART_EMPTY', message: 'Корзина пуста' }],
      };
    }

    // Check if shop is selected
    if (!cart.selectedShop) {
      errors.push({ code: 'CART_NO_SHOP', message: 'Магазин не выбран' });
      return {
        isValid: false,
        status: CartStatus.EMPTY,
        errors,
      };
    }

    const shopId = cart.selectedShop.toString();

    // Check shop status
    const shop = await this.shopPort.getShop(
      { filter: { shopId } },
      queryOptions
    );

    if (!shop) {
      errors.push({ code: 'CART_SHOP_NOT_FOUND', message: 'Магазин не найден' });
    } else if (shop.status !== ShopEnums.ShopStatus.OPENED) {
      errors.push({
        code: 'CART_SHOP_CLOSED',
        message: 'Магазин закрыт',
        details: { shopStatus: shop.status },
      });
    }

    // Check shift
    const currentShift = await this.shiftPort.getCurrentShiftOfShop(shopId, queryOptions);
    if (!currentShift || currentShift.status !== ShiftEnums.ShiftStatus.OPEN) {
      errors.push({
        code: 'CART_NO_ACTIVE_SHIFT',
        message: 'У магазина нет активной смены',
      });
    }

    // Check products availability
    let totalSum = 0;
    for (const cartItem of cart.products) {
      const shopProduct = cartItem.shopProduct as any;

      if (!shopProduct || !shopProduct.product) {
        errors.push({
          code: 'CART_PRODUCT_UNAVAILABLE',
          message: 'Товар недоступен',
          details: { shopProductId: cartItem.shopProduct.toString() },
        });
        continue;
      }

      // Check stock
      if (shopProduct.stockQuantity < cartItem.selectedQuantity) {
        errors.push({
          code: 'CART_INSUFFICIENT_STOCK',
          message: `Недостаточно товара "${shopProduct.product.productName}"`,
          details: {
            shopProductId: shopProduct._id.toString(),
            available: shopProduct.stockQuantity,
            requested: cartItem.selectedQuantity,
          },
        });
      }

      // Calculate sum
      const price = shopProduct.product.price || 0;
      totalSum += price * cartItem.selectedQuantity;
    }

    // Check minimum order sum
    if (shop && shop.minOrderSum && totalSum < shop.minOrderSum) {
      errors.push({
        code: 'CART_MIN_ORDER_NOT_MET',
        message: `Минимальная сумма заказа ${shop.minOrderSum}₽`,
        details: { minOrderSum: shop.minOrderSum, currentSum: totalSum },
      });
    }

    // Check delivery
    if (!cart.deliveryInfo?.addressId) {
      errors.push({
        code: 'CART_DELIVERY_NOT_SET',
        message: 'Адрес доставки не установлен',
      });
    }

    // Determine status
    let status = CartStatus.HAS_PRODUCTS;
    if (cart.selectedShop && cart.products.length > 0) {
      status = CartStatus.HAS_PRODUCTS;
      if (cart.deliveryInfo?.addressId) {
        status = CartStatus.DELIVERY_SET;
        if (errors.length === 0) {
          status = CartStatus.READY_TO_ORDER;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      status,
      errors,
    };
  }

  // ====================================================
  // COMMANDS
  // ====================================================

  async createCart(
    command: CreateCartCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Cart> {
    const { customerId } = command;
    checkId([customerId]);

    // Check if cart already exists
    const existingCart = await this.cartModel.findOne({
      customer: new Types.ObjectId(customerId),
    }).session(commandOptions?.session || null).exec();

    if (existingCart) {
      return existingCart;
    }

    const cartData = {
      _id: new Types.ObjectId(),
      customer: new Types.ObjectId(customerId),
      selectedShop: null,
      products: [],
      totalSum: 0,
      deliveryInfo: {},
      isReadyToOrder: false,
    };

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const cart = await this.cartModel.create([cartData], createOptions).then(docs => docs[0]);
    return cart;
  }

  async selectShop(
    command: SelectShopCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Cart> {
    const { customerId, payload } = command;
    checkId([customerId, payload.shopId]);

    const cart = await this.getOrCreateCart(customerId, commandOptions);

    // Check if shop exists and is open
    const shop = await this.shopPort.getShop(
      { filter: { shopId: payload.shopId } },
      commandOptions
    );

    if (!shop) {
      throw DomainError.notFound('Shop', payload.shopId);
    }

    if (shop.status !== ShopEnums.ShopStatus.OPENED) {
      throw DomainError.invariant('Магазин закрыт', { shopStatus: shop.status });
    }

    const cartDoc = await this.cartModel.findById(cart._id)
      .session(commandOptions?.session || null)
      .exec();

    if (!cartDoc) {
      throw DomainError.notFound('Cart', cart._id.toString());
    }

    // If different shop selected and cart has products
    if (cartDoc.selectedShop &&
        cartDoc.selectedShop.toString() !== payload.shopId &&
        cartDoc.products.length > 0) {
      if (!payload.force) {
        throw DomainError.validation(
          'Корзина содержит товары из другого магазина. Для смены магазина используйте force=true',
          { currentShopId: cartDoc.selectedShop.toString(), newShopId: payload.shopId }
        );
      }
      // Clear cart for new shop
      cartDoc.products = [];
      cartDoc.totalSum = 0;
      cartDoc.deliveryInfo = { addressId: null, price: 0, estimatedTime: null };
    }

    cartDoc.selectedShop = new Types.ObjectId(payload.shopId);
    await this.updateCartState(cartDoc, commandOptions);

    return cartDoc;
  }

  async unselectShop(
    command: UnselectShopCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Cart> {
    const { customerId } = command;
    checkId([customerId]);

    const cartDoc = await this.cartModel.findOne({ customer: new Types.ObjectId(customerId) })
      .session(commandOptions?.session || null)
      .exec();

    if (!cartDoc) {
      throw DomainError.notFound('Cart', customerId);
    }

    cartDoc.selectedShop = null;
    cartDoc.products = [];
    cartDoc.totalSum = 0;
    cartDoc.deliveryInfo = { addressId: null, price: 0, estimatedTime: null };
    cartDoc.isReadyToOrder = false;

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    await cartDoc.save(saveOptions);

    return cartDoc;
  }

  async addProduct(
    command: AddProductCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Cart> {
    const { customerId, payload } = command;
    checkId([customerId, payload.shopProductId]);

    if (payload.quantity <= 0) {
      throw DomainError.validation('Количество должно быть больше 0');
    }

    const cartDoc = await this.cartModel.findOne({ customer: new Types.ObjectId(customerId) })
      .session(commandOptions?.session || null)
      .exec();

    if (!cartDoc) {
      throw DomainError.notFound('Cart', customerId);
    }

    if (!cartDoc.selectedShop) {
      throw DomainError.validation('Сначала выберите магазин');
    }

    // Get shop product
    const shopProduct = await this.shopProductPort.getShopProduct(
      new ShopProductQueries.GetShopProductQuery(payload.shopProductId),
      commandOptions
    );

    if (!shopProduct) {
      throw DomainError.notFound('ShopProduct', payload.shopProductId);
    }

    // Check if product belongs to selected shop
    if (shopProduct.pinnedTo.toString() !== cartDoc.selectedShop.toString()) {
      throw DomainError.validation('Товар не принадлежит выбранному магазину');
    }

    // Check stock
    if (shopProduct.stockQuantity < payload.quantity) {
      throw DomainError.validation(
        `Недостаточно товара в наличии (доступно: ${shopProduct.stockQuantity})`,
        { available: shopProduct.stockQuantity, requested: payload.quantity }
      );
    }

    // Check if product already in cart
    const existingIndex = cartDoc.products.findIndex(
      p => p.shopProduct.toString() === payload.shopProductId
    );

    if (existingIndex >= 0) {
      // Update quantity
      const newQuantity = cartDoc.products[existingIndex].selectedQuantity + payload.quantity;
      if (newQuantity > shopProduct.stockQuantity) {
        throw DomainError.validation(
          `Недостаточно товара в наличии (доступно: ${shopProduct.stockQuantity})`,
          { available: shopProduct.stockQuantity, requested: newQuantity }
        );
      }
      cartDoc.products[existingIndex].selectedQuantity = newQuantity;
    } else {
      // Add new product
      cartDoc.products.push({
        shopProduct: new Types.ObjectId(payload.shopProductId),
        selectedQuantity: payload.quantity,
      });
    }

    await this.updateCartState(cartDoc, commandOptions);
    return cartDoc;
  }

  async updateProductQuantity(
    command: UpdateProductQuantityCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Cart> {
    const { customerId, payload } = command;
    checkId([customerId, payload.shopProductId]);

    const cartDoc = await this.cartModel.findOne({ customer: new Types.ObjectId(customerId) })
      .session(commandOptions?.session || null)
      .exec();

    if (!cartDoc) {
      throw DomainError.notFound('Cart', customerId);
    }

    const existingIndex = cartDoc.products.findIndex(
      p => p.shopProduct.toString() === payload.shopProductId
    );

    if (existingIndex < 0) {
      throw DomainError.notFound('Product in cart', payload.shopProductId);
    }

    if (payload.quantity <= 0) {
      // Remove product
      cartDoc.products.splice(existingIndex, 1);
    } else {
      // Check stock
      const shopProduct = await this.shopProductPort.getShopProduct(
        new ShopProductQueries.GetShopProductQuery(payload.shopProductId),
        commandOptions
      );

      if (!shopProduct) {
        throw DomainError.notFound('ShopProduct', payload.shopProductId);
      }

      if (shopProduct.stockQuantity < payload.quantity) {
        throw DomainError.validation(
          `Недостаточно товара в наличии (доступно: ${shopProduct.stockQuantity})`,
          { available: shopProduct.stockQuantity, requested: payload.quantity }
        );
      }

      cartDoc.products[existingIndex].selectedQuantity = payload.quantity;
    }

    await this.updateCartState(cartDoc, commandOptions);
    return cartDoc;
  }

  async removeProduct(
    command: RemoveProductCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Cart> {
    const { customerId, payload } = command;
    checkId([customerId, payload.shopProductId]);

    const cartDoc = await this.cartModel.findOne({ customer: new Types.ObjectId(customerId) })
      .session(commandOptions?.session || null)
      .exec();

    if (!cartDoc) {
      throw DomainError.notFound('Cart', customerId);
    }

    const existingIndex = cartDoc.products.findIndex(
      p => p.shopProduct.toString() === payload.shopProductId
    );

    if (existingIndex < 0) {
      throw DomainError.notFound('Product in cart', payload.shopProductId);
    }

    cartDoc.products.splice(existingIndex, 1);
    await this.updateCartState(cartDoc, commandOptions);

    return cartDoc;
  }

  async setDelivery(
    command: SetDeliveryCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Cart> {
    const { customerId, payload } = command;
    checkId([customerId, payload.addressId]);

    const cartDoc = await this.cartModel.findOne({ customer: new Types.ObjectId(customerId) })
      .session(commandOptions?.session || null)
      .exec();

    if (!cartDoc) {
      throw DomainError.notFound('Cart', customerId);
    }

    // TODO: Validate address belongs to customer
    // TODO: Calculate delivery price based on distance
    // TODO: Calculate estimated delivery time

    cartDoc.deliveryInfo = {
      addressId: new Types.ObjectId(payload.addressId),
      price: 0, // TODO: Calculate
      estimatedTime: 60, // TODO: Calculate
    };

    await this.updateCartState(cartDoc, commandOptions);
    return cartDoc;
  }

  async clearCart(
    command: ClearCartCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Cart> {
    const { customerId } = command;
    checkId([customerId]);

    const cartDoc = await this.cartModel.findOne({ customer: new Types.ObjectId(customerId) })
      .session(commandOptions?.session || null)
      .exec();

    if (!cartDoc) {
      throw DomainError.notFound('Cart', customerId);
    }

    cartDoc.products = [];
    cartDoc.totalSum = 0;
    cartDoc.isReadyToOrder = false;
    // Keep selectedShop and deliveryInfo

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    await cartDoc.save(saveOptions);

    return cartDoc;
  }

  // ====================================================
  // PRIVATE HELPERS
  // ====================================================

  private async getOrCreateCart(
    customerId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<Cart> {
    const existingCart = await this.cartModel.findOne({ customer: new Types.ObjectId(customerId) })
      .session(commandOptions?.session || null)
      .exec();

    if (existingCart) {
      return existingCart;
    }

    return this.createCart(new CreateCartCommand(customerId), commandOptions);
  }

  private async updateCartState(
    cartDoc: Cart,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    // Recalculate total sum
    let totalSum = 0;

    if (cartDoc.products.length > 0) {
      const productIds = cartDoc.products.map(p => p.shopProduct.toString());
      const shopProducts = await this.shopProductPort.getShopProductsByIds(
        new ShopProductQueries.GetShopProductsByIdsQuery(productIds, { populateProduct: true }),
        commandOptions
      );

      const productMap = new Map(shopProducts.map(p => [p._id.toString(), p]));

      for (const item of cartDoc.products) {
        const shopProduct = productMap.get(item.shopProduct.toString()) as any;
        if (shopProduct?.product?.price) {
          totalSum += shopProduct.product.price * item.selectedQuantity;
        }
      }
    }

    cartDoc.totalSum = totalSum;

    // Check if ready to order
    const hasProducts = cartDoc.products.length > 0;
    const hasShop = !!cartDoc.selectedShop;
    const hasDelivery = !!cartDoc.deliveryInfo?.addressId;

    cartDoc.isReadyToOrder = hasProducts && hasShop && hasDelivery;

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    await cartDoc.save(saveOptions);
  }
}
