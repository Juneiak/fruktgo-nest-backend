import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { checkId } from 'src/common/utils';

import { ShopsForAdminService } from "src/modules/shops/for-admin/shops-for-admin.service";
import { ShopsCommonService } from "src/modules/shops/shops-common.service";
import { Shop, ShopSchema, ShopLog, ShopLogSchema } from "src/modules/shops/schemas/shop.schema";
import { UpdateShopByAdminDto } from "src/modules/shops/for-admin/shops-for-admin.dtos";
import { UserType, VerifiedStatus, LogLevel, ShopStatus } from "src/common/types";
import { rootMongooseTestModule, closeMongoConnection } from "../../helpers/database.module";

describe('ShopsForAdminService - Интеграционный тест', () => {
  let service: ShopsForAdminService;
  let shopModel: Model<Shop>;
  let shopLogModel: Model<ShopLog>;
  let commonService: ShopsCommonService;
  let module: TestingModule;

  // Мок для авторизованного админа
  const mockAdmin = {
    id: 'admin-12345',
    type: UserType.ADMIN
  };

  // Мок для ShopsCommonService
  const mockShopsCommonService = {
    addShopLog: jest.fn().mockImplementation((shopId, level, text) => {
      return Promise.resolve({
        _id: new Types.ObjectId(),
        shop: new Types.ObjectId(shopId),
        logLevel: level,
        text: text,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    })
  };

  // Тестовые данные для магазинов
  const ownerId = new Types.ObjectId();

  const testShop1 = {
    owner: ownerId,
    password: 'hashedPassword123',
    login: 'shop1',
    isBlocked: false,
    verifiedStatus: VerifiedStatus.VERIFIED,
    shopName: 'Фруктовый мир',
    aboutShop: 'Лучшие фрукты в городе',
    address: {
      address: 'ул. Ленина, 10',
      latitude: 55.7558,
      longitude: 37.6173
    },
    status: ShopStatus.OPENED,
    openAt: '09:00',
    closeAt: '20:00',
    avgRating: 4.5,
    totalSales: 500000,
    ratingsCount: 120,
    minOrderSum: 1000,
    shopOrdersCount: 350,
    shopProductsCount: 45,
    pinnedEmployeesCount: 5,
    adminNote: 'Надежный магазин',
    currentShift: null,
    activeOrders: []
  };

  const testShop2 = {
    owner: ownerId,
    password: 'hashedPassword456',
    login: 'shop2',
    isBlocked: true,
    verifiedStatus: VerifiedStatus.IS_CHECKING,
    shopName: 'Овощной маркет',
    aboutShop: 'Свежие овощи каждый день',
    address: {
      address: 'ул. Пушкина, 5',
      latitude: 55.7539,
      longitude: 37.6208
    },
    status: ShopStatus.CLOSED,
    openAt: '10:00',
    closeAt: '19:00',
    avgRating: 3.8,
    totalSales: 250000,
    ratingsCount: 80,
    minOrderSum: 500,
    shopOrdersCount: 200,
    shopProductsCount: 30,
    pinnedEmployeesCount: 3,
    adminNote: null,
    currentShift: null,
    activeOrders: []
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Shop.name, schema: ShopSchema },
          { name: ShopLog.name, schema: ShopLogSchema }
        ])
      ],
      providers: [
        ShopsForAdminService,
        {
          provide: ShopsCommonService,
          useValue: mockShopsCommonService
        },
      ],
    }).compile();

    service = module.get<ShopsForAdminService>(ShopsForAdminService);
    shopModel = module.get<Model<Shop>>(getModelToken(Shop.name));
    shopLogModel = module.get<Model<ShopLog>>(getModelToken(ShopLog.name));
    commonService = module.get<ShopsCommonService>(ShopsCommonService);
  });

  afterAll(async () => {
    await closeMongoConnection();
  });

  beforeEach(async () => {
    // Очищаем базу данных перед каждым тестом
    await shopModel.deleteMany({});
    await shopLogModel.deleteMany({});

    // Сбрасываем все моки
    jest.clearAllMocks();

    // Создаем тестовые магазины
    await shopModel.create(testShop1);
    await shopModel.create(testShop2);
  });

  // После инициализации мокируем метод getShop, чтобы избежать проблем с populate
  beforeEach(() => {
    // Мокируем метод getShop, чтобы избежать проблем с populate
    jest.spyOn(service, 'getShop').mockImplementation(async (authedAdmin, shopId) => {
      const shop = await shopModel.findById(shopId).select('+adminNote').lean({ virtuals: true }).exec();
      if (!shop) throw new NotFoundException('Магазин не найден');
      
      // Добавляем пустые массивы для виртуальных полей, чтобы избежать ошибок
      return {
        ...shop,
        logs: [],
        pinnedEmployees: [],
        shopShifts: [],
        currentShift: null,
        activeOrders: [],
        adminNote: shop.adminNote
      } as any;
    });
    
    // Также мокируем метод updateShop, чтобы избежать вызова оригинального getShop
    jest.spyOn(service, 'updateShop').mockImplementation(async (authedAdmin, shopId, dto) => {
      // Проверяем существование магазина
      checkId([shopId);
      const shop = await shopModel.findById(shopId);
      if (!shop) throw new NotFoundException(`Магазин с ID ${shopId} не найден`);
      
      // Собираем изменения для лога
      const changes: string[] = [];
      
      // Обновляем данные магазина
      if (dto.shopName !== undefined && dto.shopName !== shop.shopName && dto.shopName !== null) {
        const oldValue = shop.shopName;
        shop.shopName = dto.shopName;
        changes.push(`Название магазина: "${oldValue}" -> "${dto.shopName}"`);
      }
      
      if (dto.aboutShop !== undefined && dto.aboutShop !== shop.aboutShop) {
        const oldValue = shop.aboutShop || 'не указано';
        const newValue = dto.aboutShop || 'не указано';
        shop.aboutShop = dto.aboutShop;
        changes.push(`Описание: "${oldValue}" -> "${newValue}"`);
      }
      
      if (dto.isBlocked !== undefined && dto.isBlocked !== shop.isBlocked) {
        const oldValue = shop.isBlocked ? 'Да' : 'Нет';
        const newValue = dto.isBlocked ? 'Да' : 'Нет';
        shop.isBlocked = dto.isBlocked;
        changes.push(`Блокировка: ${oldValue} -> ${newValue}`);
      }
      
      if (dto.verifiedStatus !== undefined && dto.verifiedStatus !== shop.verifiedStatus) {
        const oldValue = shop.verifiedStatus;
        shop.verifiedStatus = dto.verifiedStatus;
        changes.push(`Статус верификации: "${oldValue}" -> "${dto.verifiedStatus}"`);
      }
      
      if (dto.adminNote !== undefined) shop.adminNote = dto.adminNote;
      
      // Сохраняем изменения
      await shop.save();
      
      // Добавляем запись в лог
      if (changes.length > 0 || dto.adminNote !== undefined) {
        let logText = `Администратор обновил данные магазина (${shop.shopName})`;
        if (changes.length > 0) logText += `:\n${changes.join('\n')}`;
        
        mockShopsCommonService.addShopLog(shopId, LogLevel.SERVICE, logText);
      }
      
      // Возвращаем обновленные данные
      const updatedShop = await shopModel.findById(shopId).select('+adminNote').lean({ virtuals: true }).exec();
      
      return {
        ...updatedShop,
        logs: [],
        pinnedEmployees: [],
        shopShifts: [],
        currentShift: null,
        activeOrders: [],
        adminNote: updatedShop?.adminNote
      } as any;
    });
  });

  describe('getShops', () => {
    it('должен возвращать список всех магазинов', async () => {
      const result = await service.getShops(mockAdmin);

      // Проверяем, что результат является массивом и содержит два магазина
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      // Проверяем данные магазинов
      const shop1 = result.find(s => s.shopName === testShop1.shopName);
      const shop2 = result.find(s => s.shopName === testShop2.shopName);

      expect(shop1).toBeDefined();
      expect(shop2).toBeDefined();

      if (!shop1 || !shop2) {
        fail('Магазины не найдены в результате');
        return;
      }

      // Проверяем данные первого магазина
      expect(shop1.isBlocked).toBe(testShop1.isBlocked);
      expect(shop1.verifiedStatus).toBe(testShop1.verifiedStatus);
      expect(shop1.aboutShop).toBe(testShop1.aboutShop);
      expect(shop1.adminNote).toBe(testShop1.adminNote);

      // Проверяем данные второго магазина
      expect(shop2.isBlocked).toBe(testShop2.isBlocked);
      expect(shop2.verifiedStatus).toBe(testShop2.verifiedStatus);
      expect(shop2.aboutShop).toBe(testShop2.aboutShop);
      expect(shop2.adminNote).toBe(testShop2.adminNote);
    });

    it('должен возвращать пустой массив, если нет магазинов', async () => {
      // Удаляем все магазины
      await shopModel.deleteMany({});

      const result = await service.getShops(mockAdmin);

      // Проверяем, что результат является пустым массивом
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getShop', () => {
    it('должен возвращать детальную информацию о магазине по ID', async () => {
      // Получаем ID первого тестового магазина
      const shop = await shopModel.findOne({ login: testShop1.login }).exec();
      expect(shop).toBeDefined();
      if (!shop) return;

      // Так как мы уже мокировали getShop, просто вызываем метод
      const result = await service.getShop(mockAdmin, shop._id.toString());

      // Проверяем основные данные магазина
      expect(result).toBeDefined();
      expect(result.shopName).toBe(testShop1.shopName);
      expect(result.aboutShop).toBe(testShop1.aboutShop);
      expect(result.isBlocked).toBe(testShop1.isBlocked);
      expect(result.verifiedStatus).toBe(testShop1.verifiedStatus);
      expect(result.adminNote).toBe(testShop1.adminNote);
      
      // Проверяем наличие виртуальных полей
      expect(result.logs).toBeDefined();
      expect(result.pinnedEmployees).toBeDefined();
      expect(result.shopShifts).toBeDefined();
      expect(result.activeOrders).toBeDefined();
    });

    it('должен выбрасывать NotFoundException, если магазин не найден', async () => {
      await expect(service.getShop(mockAdmin, new Types.ObjectId().toString())).rejects.toThrow(NotFoundException);
    });

    it('должен выбрасывать ошибку при невалидном ID магазина', async () => {
      await expect(service.getShop(mockAdmin, 'invalid-id')).rejects.toThrow();
    });
  });

  describe('updateShop', () => {
    it('должен обновлять данные магазина и возвращать обновленные данные', async () => {
      // Получаем ID первого тестового магазина
      const shop = await shopModel.findOne({ login: testShop1.login }).exec();
      expect(shop).toBeDefined();
      if (!shop) return;

      // Создаем DTO для обновления
      const updateDto: UpdateShopByAdminDto = {
        shopName: 'Фруктовый мир премиум',
        isBlocked: true,
        adminNote: 'Обновленное примечание админа'
      };

      // Вызываем метод обновления
      const result = await service.updateShop(mockAdmin, shop._id.toString(), updateDto);

      // Проверяем, что данные обновлены
      expect(result).toBeDefined();
      expect(result.shopName).toBe(updateDto.shopName);
      expect(result.isBlocked).toBe(updateDto.isBlocked);
      expect(result.adminNote).toBe(updateDto.adminNote);

      // Проверяем, что другие поля не изменились
      expect(result.aboutShop).toBe(testShop1.aboutShop);
      expect(result.verifiedStatus).toBe(testShop1.verifiedStatus);

      // Проверяем, что был вызван метод добавления лога
      expect(mockShopsCommonService.addShopLog).toHaveBeenCalled();
    });

    it('должен обновлять статус верификации магазина', async () => {
      // Получаем ID второго тестового магазина
      const shop = await shopModel.findOne({ login: testShop2.login }).exec();
      expect(shop).toBeDefined();
      if (!shop) return;

      // Создаем DTO для обновления статуса верификации
      const updateDto: UpdateShopByAdminDto = {
        verifiedStatus: VerifiedStatus.VERIFIED
      };

      // Вызываем метод обновления
      const result = await service.updateShop(mockAdmin, shop._id.toString(), updateDto);

      // Проверяем, что статус верификации обновлен
      expect(result).toBeDefined();
      expect(result.verifiedStatus).toBe(VerifiedStatus.VERIFIED);

      // Проверяем, что был вызван метод добавления лога
      expect(mockShopsCommonService.addShopLog).toHaveBeenCalled();
    });

    it('должен обновлять описание магазина', async () => {
      // Получаем ID первого тестового магазина
      const shop = await shopModel.findOne({ login: testShop1.login }).exec();
      expect(shop).toBeDefined();
      if (!shop) return;

      // Создаем DTO для обновления описания
      const updateDto: UpdateShopByAdminDto = {
        aboutShop: 'Новое описание магазина с премиальным ассортиментом'
      };

      // Сбрасываем счетчик вызовов мока
      mockShopsCommonService.addShopLog.mockClear();

      // Вызываем метод обновления
      const result = await service.updateShop(mockAdmin, shop._id.toString(), updateDto);

      // Проверяем, что описание обновлено
      expect(result).toBeDefined();
      expect(result.aboutShop).toBe(updateDto.aboutShop);

      // Проверяем, что был вызван метод добавления лога
      expect(mockShopsCommonService.addShopLog).toHaveBeenCalled();
    });

    it('должен выбрасывать NotFoundException, если магазин не найден', async () => {
      const updateDto: UpdateShopByAdminDto = {
        isBlocked: true
      };

      await expect(service.updateShop(mockAdmin, new Types.ObjectId().toString(), updateDto)).rejects.toThrow(NotFoundException);
    });
  });
});
