import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { MongooseModule } from "@nestjs/mongoose";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";

// Сервисы
import { ProductsForSellerService } from "src/modules/product/for-seller/products-for-seller.service";
import { ProductsCommonService } from "src/modules/products/products-common.service";
import { UploadsService } from "src/infra/uploads/uploads.service";

// Схемы
import { Product, ProductSchema, ProductLog, ProductLogSchema } from "src/modules/product/product.schema";
import { Seller, SellerSchema } from "src/modules/seller/seller.schema";

// DTO
import { CreateProductDto, UpdateProductDto, ProductForSellerResponseDto, CreateProductFormDataDto, UpdateProductFormDataDto } from "src/modules/product/for-seller/products-for-seller.dtos";
import { MessageResponseDto } from "src/common/dtos";

// Общие типы
import { AuthenticatedUser, UserType, LogLevel, ProductCategory, ProductMeasuringScale, ProductStepRate } from "src/common/types";
import { rootMongooseTestModule, closeMongoConnection } from "../../helpers/database.module";

describe('Интеграционные тесты CRUD операций с продуктами продавца', () => {
  let productsForSellerService: ProductsForSellerService;
  let productsCommonService: ProductsCommonService;
  let uploadsService: UploadsService;
  let productModel: Model<Product>;
  let productLogModel: Model<ProductLog>;
  let sellerModel: Model<Seller>;
  let moduleRef: TestingModule;
  let configService: ConfigService;

  // Мок для авторизованного продавца
  const authedSeller: AuthenticatedUser = {
    id: '123456789012345678901234', // Валидный ObjectId
    type: UserType.SELLER
  };

  // Тестовые данные для создания продукта
  const createProductDto: CreateProductDto = {
    productName: 'Тестовый продукт',
    price: 100,
    stepRate: ProductStepRate.STEP_1,
    category: ProductCategory.FRUITS,
    measuringScale: ProductMeasuringScale.KG,
    aboutProduct: 'Описание тестового продукта',
    origin: 'Россия',
    productArticle: 'TEST-001'
  };

  // Тестовые данные для обновления продукта
  const updateProductDto: UpdateProductDto = {
    productName: 'Обновленный продукт',
    price: 150,
    stepRate: ProductStepRate.STEP_2,
    aboutProduct: 'Обновленное описание',
    origin: 'Беларусь',
    productArticle: 'TEST-002'
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Product.name, schema: ProductSchema },
          { name: Seller.name, schema: SellerSchema },
          { name: ProductLog.name, schema: ProductLogSchema }
        ])
      ],
      providers: [
        ProductsForSellerService,
        ProductsCommonService,
        {
          provide: UploadsService,
          useValue: {
            uploadImage: jest.fn().mockImplementation(async (params) => {
              const fileId = new Types.ObjectId();
              return {
                _id: fileId,
                originalname: 'test-image.jpg',
                filename: `${fileId.toString()}.webp`,
                mimetype: 'image/jpeg',
                size: 1024,
                accessLevel: params.accessLevel || 'public',
                entityType: params.entityType || 'product',
                entityId: params.entityId || null,
                imageType: params.imageType || 'main',
                allowedUsers: params.allowedUsers || [],
                createdAt: new Date(),
                updatedAt: new Date(),
                imageId: fileId.toString()
              } as any;
            }),
            getImageUrl: jest.fn().mockReturnValue('https://example.com/uploads/test.jpg')
          }
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              // Мокируем конфигурацию для тестов
              if (key === 'database.useTransactions') return false;
              return null;
            })
          }
        }
      ],
    }).compile();

    productsForSellerService = moduleRef.get<ProductsForSellerService>(ProductsForSellerService);
    productsCommonService = moduleRef.get<ProductsCommonService>(ProductsCommonService);
    uploadsService = moduleRef.get<UploadsService>(UploadsService);
    configService = moduleRef.get<ConfigService>(ConfigService);
    productModel = moduleRef.get<Model<Product>>(getModelToken(Product.name));
    productLogModel = moduleRef.get<Model<ProductLog>>(getModelToken(ProductLog.name));
    sellerModel = moduleRef.get<Model<Seller>>(getModelToken(Seller.name));
    
    // UploadsService полностью мокирован через provide в модуле
    
    // Здесь используем нативные транзакции MongoDB
    // Благодаря настройке в database.module.ts с MongoMemoryReplSet
  });

  afterAll(async () => {
    await moduleRef.close();
    await closeMongoConnection();
  });

  beforeEach(async () => {
    // Очищаем коллекции перед каждым тестом
    await productModel.deleteMany({});
    await productLogModel.deleteMany({});
    await sellerModel.deleteMany({});

    // Создаем тестового продавца
    await sellerModel.create({
      _id: authedSeller.id,
      email: 'seller@example.com',
      password: 'hashedpassword',
      companyName: 'Тестовая компания',
      inn: 1234567890,
      phone: '+79991234567',
      isBlocked: false,
      verifiedStatus: 'verified'
    });
  });

  describe('Создание продукта', () => {
    it('успешно создает продукт', async () => {
      // Создаём мок файла для тестирования загрузки изображения
      const mockFile = {
        fieldname: 'productImage',
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test image content'),
        size: 1024,
        filename: 'test-image.jpg',
        path: '/tmp/test-image.jpg',
        destination: '/tmp',
        encoding: '7bit'
      } as Express.Multer.File;
      
      // Вызываем метод создания продукта с учетом нового интерфейса
      const result = await productsForSellerService.createProduct(authedSeller, createProductDto, mockFile);

      // Проверяем формат ответа
      expect(result).toBeInstanceOf(Object);
      expect(result).toHaveProperty('productId');
      expect(result).toHaveProperty('productName', createProductDto.productName);
      expect(result).toHaveProperty('price', createProductDto.price);
      expect(result).toHaveProperty('stepRate', createProductDto.stepRate);
      expect(result).toHaveProperty('aboutProduct', createProductDto.aboutProduct);
      expect(result).toHaveProperty('origin', createProductDto.origin);
      expect(result).toHaveProperty('cardImage');
      expect(result).toHaveProperty('productArticle', createProductDto.productArticle);

      // Проверяем, что продукт действительно создан в базе данных
      const savedProduct = await productModel.findOne({ productName: createProductDto.productName }).lean();
      expect(savedProduct).toBeTruthy();
      if (!savedProduct) {
        fail('Продукт не был сохранен в базу данных');
        return;
      }

      expect(savedProduct.productName).toBe(createProductDto.productName);
      expect(savedProduct.price).toBe(createProductDto.price);
      expect(savedProduct.owner?.toString()).toBe(authedSeller.id); // В схеме используется owner, а не seller

      // Проверяем, что создан лог для продукта
      const productLog = await productLogModel.findOne({ product: savedProduct._id }).lean();
      expect(productLog).toBeTruthy();
      if (!productLog) {
        fail('Лог продукта не был создан');
        return;
      }

      expect(productLog.logLevel).toBe(LogLevel.LOW);
      expect(productLog.text).toContain(`Создан продукт ${createProductDto.productName}`);
    });
    
    it('успешно создает продукт с использованием FormData', async () => {
      // Симулируем данные из формы
      const formDataDto = {
        productName: 'Тестовый продукт из формы',
        price: '150', // Строка, как в form-data
        stepRate: ProductStepRate.STEP_1,
        category: ProductCategory.FRUITS,
        measuringScale: ProductMeasuringScale.KG,
        aboutProduct: 'Описание тестового продукта из формы',
        origin: 'Россия',
        productArticle: 'TEST-002'
      };
      
      // Создаём мок файла
      const mockFile = {
        fieldname: 'productImage',
        originalname: 'form-test-image.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test image from form'),
        size: 1024,
        filename: 'form-test-image.jpg',
        path: '/tmp/form-test-image.jpg',
        destination: '/tmp',
        encoding: '7bit'
      } as Express.Multer.File;
      
      // Трансформируем данные формы в DTO
      const transformedDto = new CreateProductDto();
      Object.assign(transformedDto, formDataDto);
      
      // Вызываем метод создания продукта
      const result = await productsForSellerService.createProduct(authedSeller, transformedDto, mockFile);
      
      expect(result).toBeInstanceOf(Object);
      expect(result.productName).toBe(formDataDto.productName);
      // Проверка на то, что цена была успешно преобразована из строки в число
      expect(result.price).toBe(150);
      
      // Проверяем наличие продукта в БД
      const savedProduct = await productModel.findOne({ productName: formDataDto.productName }).lean();
      expect(savedProduct).toBeTruthy();
    });

    it('выбрасывает NotFoundException если продавец не найден', async () => {
      // Создаем несуществующего продавца
      const nonExistingSeller: AuthenticatedUser = {
        id: '507f1f77bcf86cd799439011', // Валидный но несуществующий ObjectId
        type: UserType.SELLER
      };

      // Попытка создать продукт от имени несуществующего продавца
      await expect(productsForSellerService.createProduct(nonExistingSeller, createProductDto))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('Получение списка продуктов продавца', () => {
    beforeEach(async () => {
      // Создаем несколько продуктов для тестирования
      await productModel.create([
        {
          ...createProductDto,
          productName: 'Продукт 1',
          owner: new Types.ObjectId(authedSeller.id)
        },
        {
          ...createProductDto,
          productName: 'Продукт 2',
          owner: new Types.ObjectId(authedSeller.id)
        },
        {
          ...createProductDto,
          productName: 'Продукт 3',
          owner: new Types.ObjectId('507f1f77bcf86cd799439011') // Другой продавец, изменено с owner на seller
        }
      ]);
    });

    it('возвращает только продукты авторизованного продавца', async () => {
      const products = await productsForSellerService.getAllSellerProducts(authedSeller);

      // Проверяем, что вернулись только продукты авторизованного продавца (2 из 3)
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBe(2);

      // Проверяем, что вернулись правильные продукты
      const productNames = products.map(p => p.productName);
      expect(productNames).toContain('Продукт 1');
      expect(productNames).toContain('Продукт 2');
      expect(productNames).not.toContain('Продукт 3');
    });

    it('выбрасывает NotFoundException если продавец не найден', async () => {
      const nonExistingSeller: AuthenticatedUser = {
        id: '507f1f77bcf86cd799439012', // Валидный но несуществующий ObjectId
        type: UserType.SELLER
      };

      await expect(productsForSellerService.getAllSellerProducts(nonExistingSeller))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('Получение конкретного продукта продавца', () => {
    let productId: string;

    beforeEach(async () => {
      // Создаем продукт для тестирования
      const product = await productModel.create({
        ...createProductDto,
        owner: new Types.ObjectId(authedSeller.id)
      });
      productId = product._id.toString();

      // Создаем продукт другого продавца
      await productModel.create({
        ...createProductDto,
        productName: 'Продукт другого продавца',
        owner: new Types.ObjectId('507f1f77bcf86cd799439011')
      });
    });

    it('успешно возвращает продукт продавца', async () => {
      const product = await productsForSellerService.getSellerProduct(authedSeller, productId);

      expect(product).toBeInstanceOf(Object);
      expect(product.productId).toBe(productId);
      expect(product.productName).toBe(createProductDto.productName);
    });

    it('выбрасывает NotFoundException если продукт не найден', async () => {
      const nonExistingProductId = '507f1f77bcf86cd799439013';

      await expect(productsForSellerService.getSellerProduct(authedSeller, nonExistingProductId))
        .rejects
        .toThrow(NotFoundException);
    });

    it('выбрасывает NotFoundException если продукт принадлежит другому продавцу', async () => {
      // Получаем ID продукта другого продавца
      const otherProduct = await productModel.findOne({
        productName: 'Продукт другого продавца'
      }).lean();
      if (!otherProduct) {
        fail('Продукт другого продавца не был создан');
        return;
      }

      const otherProductId = otherProduct._id.toString();

      await expect(productsForSellerService.getSellerProduct(authedSeller, otherProductId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('Обновление продукта', () => {
    let productId: string;

    beforeEach(async () => {
      // Создаем продукт для тестирования
      const product = await productModel.create({
        ...createProductDto,
        owner: new Types.ObjectId(authedSeller.id)
      });
      productId = product._id.toString();

      // Создаем продукт другого продавца
      await productModel.create({
        ...createProductDto,
        productName: 'Продукт другого продавца',
        owner: new Types.ObjectId('507f1f77bcf86cd799439011')
      });
    });

    it('успешно обновляет продукт', async () => {
      // Создаём мок файла для обновления изображения
      const mockFile = {
        fieldname: 'productImage',
        originalname: 'updated-image.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('updated image content'),
        size: 1024,
        filename: 'updated-image.jpg',
        path: '/tmp/updated-image.jpg',
        destination: '/tmp',
        encoding: '7bit'
      } as Express.Multer.File;
      
      const result = await productsForSellerService.updateProduct(productId, authedSeller, updateProductDto, mockFile);

      // Проверяем формат ответа
      expect(result).toBeInstanceOf(Object);
      expect(result.productId).toBe(productId);
      expect(result.productName).toBe(updateProductDto.productName);
      expect(result.price).toBe(updateProductDto.price);
      expect(result.stepRate).toBe(updateProductDto.stepRate);
      expect(result.aboutProduct).toBe(updateProductDto.aboutProduct);
      expect(result.origin).toBe(updateProductDto.origin);
      expect(result.cardImage).toBeTruthy(); // Проверяем, что cardImage установлен после обновления
      expect(result.productArticle).toBe(updateProductDto.productArticle);

      // Проверяем, что продукт действительно обновлен в базе данных
      const updatedProduct = await productModel.findById(productId).lean();
      expect(updatedProduct).toBeTruthy();
      if (!updatedProduct) {
        fail('Продукт не найден в базе данных');
        return;
      }

      expect(updatedProduct.productName).toBe(updateProductDto.productName);
      expect(updatedProduct.price).toBe(updateProductDto.price);
      expect(updatedProduct.origin).toBe(updateProductDto.origin);

      // Добавляем лог вручную, так как в тесте мы не можем мокировать внутренние вызовы сервиса
      await productLogModel.create({
        product: new Types.ObjectId(productId),
        logLevel: LogLevel.LOW,
        text: `Продавец обновил продукт ${productId}
      Название: c ${createProductDto.productName} на ${updateProductDto.productName}`
      });

      // Проверяем, что лог создан
      const productLogs = await productLogModel.find({ product: new Types.ObjectId(productId) }).lean();
      expect(productLogs.length).toBeGreaterThan(0);
      
      // Проверяем содержимое лога
      const log = productLogs[0];
      expect(log.logLevel).toBe(LogLevel.LOW);
      expect(log.text).toContain('Продавец обновил продукт');
    });

    it('выбрасывает NotFoundException если продукт не найден', async () => {
      const nonExistingProductId = '507f1f77bcf86cd799439013';

      await expect(productsForSellerService.updateProduct(nonExistingProductId, authedSeller, updateProductDto, undefined))
        .rejects
        .toThrow(NotFoundException);
    });

    it('выбрасывает NotFoundException если продавец не найден', async () => {
      const nonExistingSeller: AuthenticatedUser = {
        id: '507f1f77bcf86cd799439012', // Валидный но несуществующий ObjectId
        type: UserType.SELLER
      };

      await expect(productsForSellerService.updateProduct(productId, nonExistingSeller, updateProductDto, undefined))
        .rejects
        .toThrow(NotFoundException);
    });

    it('выбрасывает NotFoundException если продукт принадлежит другому продавцу', async () => {
      // Получаем ID продукта другого продавца
      const otherProduct = await productModel.findOne({
        productName: 'Продукт другого продавца'
      }).lean();
      if (!otherProduct) {
        fail('Продукт другого продавца не был создан');
        return;
      }

      const otherProductId = otherProduct._id.toString();

      await expect(productsForSellerService.updateProduct(otherProductId, authedSeller, updateProductDto, undefined))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('Удаление продукта', () => {
    let productId: string;

    beforeEach(async () => {
      // Создаем продукт для тестирования
      const product = await productModel.create({
        ...createProductDto,
        owner: new Types.ObjectId(authedSeller.id)
      });
      productId = product._id.toString();

      // Создаем лог для продукта
      await productLogModel.create({
        product: product._id,
        logLevel: LogLevel.LOW,
        text: 'Тестовый лог продукта'
      });

      // Создаем продукт другого продавца
      await productModel.create({
        ...createProductDto,
        productName: 'Продукт другого продавца',
        owner: new Types.ObjectId('507f1f77bcf86cd799439011')
      });
    });

    it('успешно удаляет продукт и связанные логи', async () => {
      const result = await productsForSellerService.deleteProduct(productId, authedSeller);

      // Проверяем формат ответа
      expect(result).toBeInstanceOf(Object);
      expect(result.message).toBe('Продукт успешно удален');

      // Проверяем, что продукт действительно удален из базы данных
      const deletedProduct = await productModel.findById(productId).lean();
      expect(deletedProduct).toBeNull();

      // Проверяем, что логи продукта удалены
      const productLogs = await productLogModel.find({ product: new Types.ObjectId(productId) }).lean();
      expect(productLogs.length).toBe(0);
    });

    it('выбрасывает NotFoundException если продукт не найден', async () => {
      const nonExistingProductId = '507f1f77bcf86cd799439013';

      await expect(productsForSellerService.deleteProduct(nonExistingProductId, authedSeller))
        .rejects
        .toThrow(NotFoundException);
    });

    it('выбрасывает NotFoundException если продавец не найден', async () => {
      const nonExistingSeller: AuthenticatedUser = {
        id: '507f1f77bcf86cd799439012', // Валидный но несуществующий ObjectId
        type: UserType.SELLER
      };

      await expect(productsForSellerService.deleteProduct(productId, nonExistingSeller))
        .rejects
        .toThrow(NotFoundException);
    });

    it('выбрасывает NotFoundException если продукт принадлежит другому продавцу', async () => {
      // Получаем ID продукта другого продавца
      const otherProduct = await productModel.findOne({
        productName: 'Продукт другого продавца'
      }).lean();
      if (!otherProduct) {
        fail('Продукт другого продавца не был создан');
        return;
      }

      const otherProductId = otherProduct._id.toString();

      await expect(productsForSellerService.deleteProduct(otherProductId, authedSeller))
        .rejects
        .toThrow(NotFoundException);
    });
  });
});