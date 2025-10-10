import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from '../../../../modules/customer/infrastructure/schemas/cart.schema';
import { plainToInstance } from 'class-transformer';
import {
  CartResponseDto,
  UpdatedCartResponseDto,
} from './customer.cart.response.dtos';
import {
  SelectShopForCartDto,
  UpdateProductInCartDto,
  RemoveProductInCartDto
} from './customer.cart.request.dtos';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { Types } from 'mongoose';
import { MessageResponseDto } from 'src/interface/http/common/common.response.dtos';
import { ShopProduct } from 'src/modules/shop-product/shop-product.schema';
import { Shop } from 'src/modules/shop/shop.schema';


@Injectable()
export class CustomerCartRoleService {
  constructor(
    @InjectModel('Cart') private cartModel: Model<Cart>,
    @InjectModel('ShopProduct') private shopProductModel: Model<ShopProduct>,
    @InjectModel('Shop') private shopModel: Model<Shop>,
  ) {}

  // ====================================================
  // CART 
  // ====================================================

  async validateAndUpdateCart(customerId: string): Promise<Cart> {
    checkId([customerId]);

    // Находим корзину клиента
    const cart = await this.cartModel.findOne({ customer: new Types.ObjectId(customerId) }).exec();
    if (!cart)  throw new NotFoundException('Корзина не найдена');

    // Инициализируем значения по умолчанию
    let isReadyToOrder = false;
    let totalSum = 0;
    
    try {
      // Ранние проверки: пустая корзина или отсутствие магазина
      if (!cart.selectedShop || !cart.products || cart.products.length === 0) {
        cart.totalSum = 0;
        cart.isReadyToOrder = false;
        await cart.save();
        return cart;
      }
      
      // Получаем информацию о магазине
      const shop = await this.shopModel.findById(cart.selectedShop).select('minOrderSum _id').lean().exec();
      
      if (!shop) {
        cart.totalSum = 0;
        cart.isReadyToOrder = false;
        await cart.save();
        return cart;
      }
      
      // Собираем IDs всех продуктов из корзины
      const shopProductIds = cart.products.map(item => item.shopProduct);
      
      // Загружаем информацию о продуктах ОДНИМ запросом
      // включая и цену (для расчета суммы) и количество (для проверки наличия)
      const shopProducts = await this.shopProductModel.find({
        _id: { $in: shopProductIds }
      })
      .select('_id product stockQuantity pinnedTo')
      .populate({ path: 'product', select: 'price' })
      .lean()
      .exec();
      
      // Проверка что все продукты принадлежат выбранному магазину
      const validProducts = shopProducts.filter(product => 
        product.pinnedTo && product.pinnedTo.toString() === shop._id.toString()
      );
      
      // Если количество валидных продуктов не совпадает, значит есть товары из другого магазина
      if (validProducts.length !== cart.products.length) {
        cart.totalSum = 0;
        cart.isReadyToOrder = false;
        await cart.save();
        return cart;
      }
      
      // Создаем Map для быстрого доступа к информации о продуктах
      const productInfoMap = new Map();
      
      for (const product of validProducts) {
        // Для расчета суммы
        // @ts-ignore
        const price = product.product?.price || 0;
        // Для проверки наличия
        const stockQuantity = product.stockQuantity || 0;
        
        productInfoMap.set(product._id.toString(), { price, stockQuantity });
      }
      
      // Рассчитываем общую стоимость и проверяем наличие
      let allProductsAvailable = true;
      
      for (const item of cart.products) {
        const productId = item.shopProduct.toString();
        const productInfo = productInfoMap.get(productId);
        
        if (!productInfo) {
          allProductsAvailable = false;
          break;
        }
        
        // Проверяем количество на складе
        if (productInfo.stockQuantity < item.selectedQuantity) {
          allProductsAvailable = false;
          break;
        }
        
        // Суммируем стоимость
        totalSum += productInfo.price * item.selectedQuantity;
      }
      
      // Проверяем минимальную сумму заказа
      const minOrderSumMet = !shop.minOrderSum || totalSum >= shop.minOrderSum;
      
      // Корзина готова к заказу если все условия выполнены
      isReadyToOrder = allProductsAvailable && minOrderSumMet;
      
      // Сохраняем результаты в корзине
      cart.isReadyToOrder = isReadyToOrder;
      cart.totalSum = totalSum;
      await cart.save();
      
      return cart;
    } catch (error) {
      console.error('Ошибка при валидации и обновлении корзины:', error);
      cart.isReadyToOrder = false;
      cart.totalSum = 0;
      await cart.save();
      return cart;
    }
  }

  async getCustomerCart(authedCustomer: AuthenticatedUser): Promise<CartResponseDto> {
    if (authedCustomer.id !== authedCustomer.id) throw new UnauthorizedException('Недостаточно прав');

    // Получаем обновленную корзину
    const cart = await this.validateAndUpdateCart(authedCustomer.id);

    // Полностью загружаем корзину для возврата
    const populatedCart = await this.cartModel.findById(cart._id)
      .populate('selectedShop')
      .populate({
        path: 'products.shopProduct',
        populate: {
          path: 'product',
        }
      })
      .lean({ virtuals: true })
      .exec();

    return plainToInstance(CartResponseDto, populatedCart, { excludeExtraneousValues: true });
  }

  async selectShopForCart(authedCustomer: AuthenticatedUser, dto: SelectShopForCartDto): Promise<CartResponseDto> {
    if (authedCustomer.id !== authedCustomer.id) throw new UnauthorizedException('Недостаточно прав');
    const cart = await this.cartModel.findOne({ customer: new Types.ObjectId(authedCustomer.id)}).exec();
    if (!cart) throw new NotFoundException('Корзина не найдена');

    // Найдем магазин по ID
    checkId([dto.shopId]);
    const shop = await this.shopModel.findById(new Types.ObjectId(dto.shopId)).exec();
    if (!shop) throw new NotFoundException('Магазин не найден');

    if (!cart.selectedShop || cart.selectedShop.toString() !== dto.shopId) {
      // Если магазин меняется, то очищаем корзину
      cart.products = [];
      cart.totalSum = 0;
      cart.isReadyToOrder = false;
      cart.deliveryInfo = null;
    }

    cart.selectedShop = shop._id;
    await cart.save();

    // Получаем обновленную корзину
    await this.validateAndUpdateCart(authedCustomer.id);
    
    // Загрузим данные корзины с данными о магазине
    const populatedCart = await this.cartModel.findById(cart._id)
      .populate('selectedShop')
      .populate({
        path: 'products.shopProduct',
        populate: 'product'
      })
      .lean({ virtuals: true })
      .exec();


    return plainToInstance(CartResponseDto, populatedCart, { excludeExtraneousValues: true });
  }

  async unselectShopForCart(authedCustomer: AuthenticatedUser): Promise<MessageResponseDto> {
    if (authedCustomer.id !== authedCustomer.id) throw new UnauthorizedException('Недостаточно прав');

    const cart = await this.cartModel.findOne({ customer: new Types.ObjectId(authedCustomer.id)}).exec();
    if (!cart) throw new NotFoundException('Корзина не найдена');
  
    // Удаляем выбранный магазин и связанные данные
    cart.selectedShop = null;
    cart.isReadyToOrder = false;
    cart.products = [];
    cart.deliveryInfo = null;
    cart.totalSum = 0;
  
    await cart.save();
    
    // Обновляем корзину
    await this.validateAndUpdateCart(authedCustomer.id);
  
    return { message: 'Магазин успешно удален из корзины' };
  }

  async updateProductInCart(authedCustomer: AuthenticatedUser, dto: UpdateProductInCartDto): Promise<UpdatedCartResponseDto> {
    if (authedCustomer.id !== authedCustomer.id) throw new UnauthorizedException('Недостаточно прав');
    const cart = await this.cartModel.findOne({ customer: new Types.ObjectId(authedCustomer.id)}).exec();

    if (!cart) throw new NotFoundException('Корзина не найдена');
    if (!cart.selectedShop) throw new BadRequestException('Сначала выберите магазин для корзины');

    // Поиск продукта
    checkId([dto.shopProductId]);
    const shopProduct = await this.shopProductModel.findById(new Types.ObjectId(dto.shopProductId))
      .select('stockQuantity pinnedTo _id product')
      .lean().exec();

    if (!shopProduct) throw new NotFoundException('Продукт не найден');
    if (shopProduct.pinnedTo.toString() !== cart.selectedShop.toString()) throw new BadRequestException('Продукт не принадлежит выбранному магазину');
    
    // Проверка доступного количества
    if (dto.quantity > shopProduct.stockQuantity) throw new BadRequestException(`Нельзя добавить больше, чем есть в наличии (${shopProduct.stockQuantity})`);
    
    // Ищем продукт в корзине
    const existingProductIndex = cart.products.findIndex(product => product.shopProduct.toString() === dto.shopProductId);

    // Если quantity = 0, удаляем продукт из корзины
    if (dto.quantity === 0) {
      if (existingProductIndex !== -1) {
        cart.products.splice(existingProductIndex, 1);
      }
    } else {
      // Обновляем или добавляем продукт
      if (existingProductIndex !== -1) {
        // Если продукт уже есть в корзине и количество не изменилось, ничего не делаем
        if (cart.products[existingProductIndex].selectedQuantity === dto.quantity) {
          // Ничего не делаем, так как количество не изменилось
        } else {
          // Иначе обновляем количество
          cart.products[existingProductIndex].selectedQuantity = dto.quantity;
        }
      } else {
        // Если продукта нет в корзине, добавляем его
        cart.products.push({
          shopProduct: shopProduct._id,
          selectedQuantity: dto.quantity
        });
      }
    }

    // Сохраняем изменения в корзине
    await cart.save();

    // Обновляем и валидируем корзину
    const updated = await this.validateAndUpdateCart(authedCustomer.id);
    
    return plainToInstance(UpdatedCartResponseDto, { isReadyToOrder: updated.isReadyToOrder }, { excludeExtraneousValues: true });
  }

  async removeProductInCart(authedCustomer: AuthenticatedUser, dto: RemoveProductInCartDto): Promise<UpdatedCartResponseDto> {
    if (authedCustomer.id !== authedCustomer.id) throw new UnauthorizedException('Недостаточно прав');
    const cart = await this.cartModel.findOne({ customer: new Types.ObjectId(authedCustomer.id)}).exec();

    if (!cart) throw new NotFoundException('Корзина не найдена');
    if (!cart.selectedShop) throw new BadRequestException('Сначала выберите магазин для корзины');
  
    checkId([dto.shopProductId]);
    
    // Проверяем, существует ли продукт в корзине
    const existingProductIndex = cart.products.findIndex(
      product => product.shopProduct.toString() === dto.shopProductId
    );
  
    if (existingProductIndex === -1) throw new NotFoundException('Продукт не найден в корзине');
  
    // Удаляем продукт из корзины
    cart.products.splice(existingProductIndex, 1);
    await cart.save();
  
    // Обновляем и валидируем корзину
    const updated = await this.validateAndUpdateCart(authedCustomer.id);
  
    return plainToInstance(UpdatedCartResponseDto, { isReadyToOrder: updated.isReadyToOrder }, { excludeExtraneousValues: true });
  }

}