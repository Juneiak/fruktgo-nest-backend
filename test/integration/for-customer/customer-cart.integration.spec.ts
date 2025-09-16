import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Model, Types } from 'mongoose';

import { rootMongooseTestModule, closeMongoConnection } from '../../helpers/database.module';
import { CartForCustomerService } from "src/modules/customer/roles/customer/cart.customer.service";
import { Customer, CustomerSchema } from "src/modules/customer/schemas/customer.schema";
import { Cart, CartSchema } from "src/modules/customer/schemas/cart.schema";
import { Shop, ShopSchema } from "src/modules/shops/schemas/shop.schema";
import { ShopProduct, ShopProductSchema } from "src/modules/shops/schemas/shop-product.schema";
import { Product, ProductSchema } from "src/modules/product/product.schema";
import { 
  SelectShopForCartDto, 
  UpdateProductInCartDto, 
  RemoveProductInCartDto 
} from 'src/modules/customer/roles/customer/cart.customer.response.dtos';
import { ShopStatus, VerifiedStatus, ProductMeasuringScale, ProductStepRate, ShopProductStatus, ProductCategory} from "src/common/types";
import { AuthenticatedUser, UserType } from "src/common/types";


describe('CartForCustomerService - Управление корзиной (Интеграционный тест)', () => {
  let service: CartForCustomerService;
  let customerModel: Model<Customer>;
  let cartModel: Model<Cart>;
  let shopModel: Model<Shop>;
  let shopProductModel: Model<ShopProduct>;
  let productModel: Model<Product>;
  let module: TestingModule;


  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Customer.name, schema: CustomerSchema },
          { name: Cart.name, schema: CartSchema },
          { name: Shop.name, schema: ShopSchema },
          { name: ShopProduct.name, schema: ShopProductSchema },
          { name: Product.name, schema: ProductSchema }
        ])
      ],
      providers: [
        CartForCustomerService
      ],
    }).compile();

    service = module.get<CartForCustomerService>(CartForCustomerService);
    customerModel = module.get<Model<Customer>>(getModelToken(Customer.name));
    cartModel = module.get<Model<Cart>>(getModelToken(Cart.name));
    shopModel = module.get<Model<Shop>>(getModelToken(Shop.name));
    shopProductModel = module.get<Model<ShopProduct>>(getModelToken(ShopProduct.name));
    productModel = module.get<Model<Product>>(getModelToken(Product.name));
  });

  afterAll(async () => {
    await closeMongoConnection();
  });

  beforeEach(async () => {
    // Очищаем коллекции перед каждым тестом
    await customerModel.deleteMany({});
    await cartModel.deleteMany({});
    await shopModel.deleteMany({});
    await shopProductModel.deleteMany({});
    await productModel.deleteMany({});
  });

  // Вспомогательная функция для создания тестовых данных
  async function createTestData() {
    // Создаем клиента и корзину
    const customer = await customerModel.create({
      customerName: 'Тест Тестович',
      email: 'test@example.com',
      password: 'hashedpassword',
      verifiedStatus: VerifiedStatus.VERIFIED,
      isBlocked: false
    });

    const cart = await cartModel.create({
      customer: customer._id,
      products: [],
      totalSum: 0,
      selectedShop: null,
      isReadyToOrder: false
    });

    // Привязываем корзину к клиенту
    customer.cart = cart._id as Types.ObjectId;
    await customer.save();

    // Создаем магазин
    const shop = await shopModel.create({
      shopName: 'Фруктовый рай',
      owner: new Types.ObjectId(),
      login: 'fruitshop',
      password: 'hashedpassword',
      verifiedStatus: VerifiedStatus.VERIFIED,
      status: ShopStatus.OPENED,
      minOrderSum: 500,
      isBlocked: false,
      address: 'ул. Фруктовая, 1',
      description: 'Лучшие фрукты в городе'
    });

    // Создаем продукты
    const apple = await productModel.create({
      productName: 'Яблоки',
      price: 120,
      measuringScale: ProductMeasuringScale.KG,
      stepRate: ProductStepRate.STEP_1,
      description: 'Сочные яблоки',
      owner: new Types.ObjectId(),
      category: ProductCategory.FRUITS
    });

    const banana = await productModel.create({
      productName: 'Бананы',
      price: 90,
      measuringScale: ProductMeasuringScale.KG,
      stepRate: ProductStepRate.STEP_2,
      description: 'Спелые бананы',
      owner: new Types.ObjectId(),
      category: ProductCategory.FRUITS
    });

    // Создаем товары в магазине
    const appleProduct = await shopProductModel.create({
      pinnedTo: shop._id,
      product: apple._id,
      stockQuantity: 10,
      status: ShopProductStatus.ACTIVE
    });

    const bananaProduct = await shopProductModel.create({
      pinnedTo: shop._id,
      product: banana._id,
      stockQuantity: 15,
      status: ShopProductStatus.ACTIVE
    });

    const authedCustomer: AuthenticatedUser = {
      id: customer.customerId,
      type: UserType.CUSTOMER
    };

    return {
      customer,
      authedCustomer,
      cart,
      shop,
      products: {
        apple,
        banana
      },
      shopProducts: {
        apple: appleProduct,
        banana: bananaProduct
      }
    };
  }

  describe('Работа с корзиной', () => {


    it('Должен получить корзину с продуктами и проверить корректность данных', async () => {
      const testData = await createTestData();
      
      // Сначала выбираем магазин
      await service.selectShopForCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { shopId: testData.shop.shopId }
      );

      // Добавляем продукт
      await service.updateProductInCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { 
          shopProductId: testData.shopProducts.apple.shopProductId, 
          quantity: 2 
        }
      );
      
      // Получаем корзину
      const result = await service.getCustomerCart(testData.authedCustomer, testData.authedCustomer.id);
      
      // Проверяем полные данные корзины
      expect(result).toBeDefined();
      expect(result.selectedShop).toBeDefined();
      expect(result.selectedShop?.shopId).toBe(testData.shop.shopId);
      
      // Проверяем продукты
      expect(result.products).toHaveLength(1);
      expect(result.products[0].shopProduct.shopProductId).toBe(testData.shopProducts.apple.shopProductId);
      expect(result.products[0].selectedQuantity).toBe(2);
      
      // Проверяем сумму и готовность к заказу через прямой запрос к БД
      const updatedCart = await cartModel.findById(testData.cart._id);
      const expectedSum = testData.products.apple.price * 2;
      expect(updatedCart?.totalSum).toBe(expectedSum);
      expect(updatedCart?.isReadyToOrder).toBe(expectedSum >= testData.shop.minOrderSum);
      expect(result.totalSum).toBe(expectedSum);
      expect(result.isReadyToOrder).toBe(expectedSum >= testData.shop.minOrderSum);
    });

    it('Должен выбрать магазин для корзины', async () => {
      const testData = await createTestData();
      
      const dto: SelectShopForCartDto = {
        shopId: testData.shop.shopId
      };

      const result = await service.selectShopForCart(testData.authedCustomer, testData.authedCustomer.id, dto);
      
      expect(result).toBeDefined();
      expect(result.selectedShop).toBeDefined();
      expect(result.selectedShop).not.toBeNull();
      if (result.selectedShop) expect(result.selectedShop.shopId).toBe(testData.shop.shopId);
      
      // Проверяем, что магазин был выбран в корзине
      const updatedCart = await cartModel.findById(testData.cart._id).populate('selectedShop');
      expect(updatedCart).not.toBeNull();
      if (updatedCart) {
        expect(updatedCart.selectedShop).toBeDefined();
        if (updatedCart.selectedShop && testData.shop._id) {
          expect(updatedCart.selectedShop._id.toString()).toBe((testData.shop._id as Types.ObjectId).toString());
        }
      }
    });

    it('Должен добавить продукт в корзину', async () => {
      const testData = await createTestData();
      
      // Сначала выбираем магазин
      await service.selectShopForCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { shopId: testData.shop.shopId }
      );

      // Затем добавляем продукт
      const dto: UpdateProductInCartDto = {
        shopProductId: testData.shopProducts.apple.shopProductId,
        quantity: 2
      };

      const result = await service.updateProductInCart(testData.authedCustomer, testData.authedCustomer.id, dto);
      console.log(result);
      expect(result).toBeDefined();
      expect(result.isReadyToOrder).toBe(false); // Сумма заказа меньше минимальной

      // Проверяем, что продукт был добавлен в корзину через прямой запрос к БД
      const updatedCart = await cartModel.findById(testData.cart._id);
      expect(updatedCart).not.toBeNull();
      if (updatedCart) {
        expect(updatedCart.products.length).toBe(1);
        expect(updatedCart.products[0].shopProduct.toString()).toBe(
          (testData.shopProducts.apple._id as Types.ObjectId).toString()
        );
        expect(updatedCart.products[0].selectedQuantity).toBe(2);
        
        // Проверяем, что общая сумма корзины рассчитана правильно
        expect(updatedCart.totalSum).toBe(testData.products.apple.price * 2);
      }
    });

    it('Должен обновить количество продукта в корзине', async () => {
      const testData = await createTestData();
      
      // Выбираем магазин и добавляем продукт
      await service.selectShopForCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { shopId: testData.shop.shopId }
      );

      await service.updateProductInCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { 
          shopProductId: testData.shopProducts.apple.shopProductId, 
          quantity: 2 
        }
      );

      // Обновляем количество
      const updateDto: UpdateProductInCartDto = {
        shopProductId: testData.shopProducts.apple.shopProductId,
        quantity: 5
      };

      const result = await service.updateProductInCart(testData.authedCustomer, testData.authedCustomer.id, updateDto);
      
      // Проверяем, что корзина готова к заказу (сумма заказа >= минимальной)
      expect(result.isReadyToOrder).toBe(true);

      // Проверяем, что количество продукта обновлено через прямой запрос к БД
      const updatedCart = await cartModel.findById(testData.cart._id);
      expect(updatedCart).not.toBeNull();
      if (updatedCart) {
        expect(updatedCart.products.length).toBe(1);
        expect(updatedCart.products[0].selectedQuantity).toBe(5);
        
        // Проверяем, что общая сумма корзины пересчитана
        expect(updatedCart.totalSum).toBe(testData.products.apple.price * 5);
      }
    });

    it('Не должен изменять корзину при отправке такого же количества продукта', async () => {
      const testData = await createTestData();
      
      // Выбираем магазин и добавляем продукт
      await service.selectShopForCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { shopId: testData.shop.shopId }
      );

      // Добавляем продукт с количеством 3
      await service.updateProductInCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { 
          shopProductId: testData.shopProducts.apple.shopProductId, 
          quantity: 3 
        }
      );

      // Получаем исходное состояние корзины
      const initialCart = await cartModel.findById(testData.cart._id);
      const initialSum = initialCart?.totalSum;
      const initialQuantity = initialCart?.products[0].selectedQuantity;

      // Отправляем такое же количество
      const updateDto: UpdateProductInCartDto = {
        shopProductId: testData.shopProducts.apple.shopProductId,
        quantity: 3 // Такое же количество как уже есть в корзине
      };

      const result = await service.updateProductInCart(testData.authedCustomer, testData.authedCustomer.id, updateDto);
      
      // Проверяем состояние корзины после обновления через прямой запрос к БД
      const updatedCart = await cartModel.findById(testData.cart._id);
      expect(updatedCart).not.toBeNull();
      if (updatedCart) {
        expect(updatedCart.products.length).toBe(1);
        expect(updatedCart.products[0].selectedQuantity).toBe(initialQuantity); // Количество не изменилось
        expect(updatedCart.totalSum).toBe(initialSum); // Сумма не изменилась
      }
    });

    it('Должен уменьшить количество продукта в корзине', async () => {
      const testData = await createTestData();
      
      // Выбираем магазин и добавляем продукт
      await service.selectShopForCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { shopId: testData.shop.shopId }
      );

      // Добавляем продукт с количеством 4
      await service.updateProductInCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { 
          shopProductId: testData.shopProducts.apple.shopProductId, 
          quantity: 4 
        }
      );

      // Уменьшаем количество
      const updateDto: UpdateProductInCartDto = {
        shopProductId: testData.shopProducts.apple.shopProductId,
        quantity: 2 // Меньше, чем было изначально
      };

      const result = await service.updateProductInCart(testData.authedCustomer, testData.authedCustomer.id, updateDto);
      
      // Проверяем состояние корзины после обновления через прямой запрос к БД
      const updatedCart = await cartModel.findById(testData.cart._id);
      expect(updatedCart).not.toBeNull();
      if (updatedCart) {
        expect(updatedCart.products.length).toBe(1);
        expect(updatedCart.products[0].selectedQuantity).toBe(2); // Количество уменьшилось
        expect(updatedCart.totalSum).toBe(testData.products.apple.price * 2); // Сумма пересчитана
        expect(updatedCart.isReadyToOrder).toBe(false); // Проверяем через БД
        expect(result.isReadyToOrder).toBe(false); // Проверяем через ответ сервиса
      }
    });
    
    it('Должен удалить продукт из корзины при отправке нулевого количества', async () => {
      const testData = await createTestData();
      
      // Выбираем магазин и добавляем продукт
      await service.selectShopForCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { shopId: testData.shop.shopId }
      );

      // Добавляем продукт
      await service.updateProductInCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { 
          shopProductId: testData.shopProducts.apple.shopProductId, 
          quantity: 3 
        }
      );

      // Отправляем нулевое количество
      const updateDto: UpdateProductInCartDto = {
        shopProductId: testData.shopProducts.apple.shopProductId,
        quantity: 0 // Нулевое количество должно удалить продукт
      };

      const result = await service.updateProductInCart(testData.authedCustomer, testData.authedCustomer.id, updateDto);
      
      expect(result.isReadyToOrder).toBe(false);

      // Проверяем состояние корзины после обновления через прямой запрос к БД
      const updatedCart = await cartModel.findById(testData.cart._id);
      expect(updatedCart).not.toBeNull();
      if (updatedCart) {
        expect(updatedCart.products.length).toBe(0); // Продукт должен быть удален
        expect(updatedCart.totalSum).toBe(0); // Сумма должна быть нулевой
        expect(updatedCart.isReadyToOrder).toBe(false); // Корзина не готова к заказу
      }
    });

    it('Должен удалить продукт из корзины', async () => {
      const testData = await createTestData();
      
      // Настраиваем корзину с продуктом
      await service.selectShopForCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { shopId: testData.shop.shopId }
      );

      await service.updateProductInCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { 
          shopProductId: testData.shopProducts.apple.shopProductId, 
          quantity: 3 
        }
      );

      // Удаляем продукт
      const removeDto: RemoveProductInCartDto = {
        shopProductId: testData.shopProducts.apple.shopProductId
      };

      const result = await service.removeProductInCart(testData.authedCustomer, testData.authedCustomer.id, removeDto);
      
      expect(result.isReadyToOrder).toBe(false);

      // Проверяем, что продукт удален из корзины
      const updatedCart = await cartModel.findById(testData.cart._id);
      expect(updatedCart).not.toBeNull();
      if (updatedCart) {
        expect(updatedCart.products.length).toBe(0);
        expect(updatedCart.totalSum).toBe(0);
      }
    });

    it('Должен отменить выбор магазина для корзины', async () => {
      const testData = await createTestData();
      
      // Выбираем магазин
      await service.selectShopForCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { shopId: testData.shop.shopId }
      );

      // Отменяем выбор магазина
      const result = await service.unselectShopForCart(testData.authedCustomer, testData.authedCustomer.id);
      
      expect(result).toBeDefined();
      expect(result.message).toContain('успешно удален');

      // Проверяем, что магазин был удален из корзины
      const updatedCart = await cartModel.findById(testData.cart._id);
      expect(updatedCart).not.toBeNull();
      if (updatedCart) {
        expect(updatedCart.selectedShop).toBeNull();
        expect(updatedCart.products.length).toBe(0); // Продукты также должны быть удалены
      }
    });

    it('Должен проверять готовность корзины к заказу', async () => {
      const testData = await createTestData();
      
      // Настраиваем корзину
      await service.selectShopForCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { shopId: testData.shop.shopId }
      );

      // Добавляем продукты, чтобы сумма была больше минимальной
      await service.updateProductInCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { 
          shopProductId: testData.shopProducts.apple.shopProductId, 
          quantity: 3 // 120 * 3 = 360
        }
      );

      await service.updateProductInCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { 
          shopProductId: testData.shopProducts.banana.shopProductId, 
          quantity: 2 // 90 * 2 = 180
        }
      );

      // Проверяем, что корзина готова к заказу (360 + 180 = 540 > минимальная сумма 500)
      const cart = await cartModel.findById(testData.cart._id);
      expect(cart).not.toBeNull();
      if (cart) {
        expect(cart.isReadyToOrder).toBe(true);
        expect(cart.totalSum).toBe(540);
      }

      await service.updateProductInCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { 
          shopProductId: testData.shopProducts.banana.shopProductId, 
          quantity: 0 // 90 * 0 = 0
        }
      );

      const cartAfter = await cartModel.findById(testData.cart._id);
      expect(cartAfter).not.toBeNull();
      if (cartAfter) {
        expect(cartAfter.isReadyToOrder).toBe(false);
        expect(cartAfter.totalSum).toBe(360);
      }
    });

    it('Должен выбрасывать ошибку при превышении доступного количества товара', async () => {
      const testData = await createTestData();
      
      // Настраиваем корзину
      await service.selectShopForCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { shopId: testData.shop.shopId }
      );

      // Добавляем продукты, чтобы сумма была больше минимальной
      await service.updateProductInCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { 
          shopProductId: testData.shopProducts.apple.shopProductId, 
          quantity: 3 // 120 * 3 = 360
        }
      );

      await service.updateProductInCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { 
          shopProductId: testData.shopProducts.banana.shopProductId, 
          quantity: 2 // 90 * 2 = 180
        }
      );

      // Проверяем, что корзина готова к заказу (360 + 180 = 540 > минимальная сумма 500)
      const cart = await cartModel.findById(testData.cart._id);
      expect(cart).not.toBeNull();
      if (cart) {
        expect(cart.isReadyToOrder).toBe(true);
        expect(cart.totalSum).toBe(testData.products.apple.price * 3 + testData.products.banana.price * 2);
      }
    });

    it('Должен выбрасывать ошибку при превышении доступного количества товара', async () => {
      const testData = await createTestData();
      
      // Выбираем магазин
      await service.selectShopForCart(
        testData.authedCustomer, 
        testData.authedCustomer.id, 
        { shopId: testData.shop.shopId }
      );

      // Пытаемся добавить продукт с количеством больше, чем в наличии
      const dto: UpdateProductInCartDto = {
        shopProductId: testData.shopProducts.apple.shopProductId,
        quantity: 20 // В наличии только 10
      };

      await expect(
        service.updateProductInCart(testData.authedCustomer, testData.authedCustomer.id, dto)
      ).rejects.toThrow(BadRequestException);
    });

    it('Должен выбрасывать ошибку при попытке добавить продукт без выбранного магазина', async () => {
      const testData = await createTestData();
      
      // Пытаемся добавить продукт без выбора магазина
      const dto: UpdateProductInCartDto = {
        shopProductId: testData.shopProducts.apple.shopProductId,
        quantity: 2
      };

      await expect(
        service.updateProductInCart(testData.authedCustomer, testData.authedCustomer.id, dto)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
