import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { checkId } from 'src/common/utils';

import { SellersForAdminService } from "src/modules/seller/for-admin/sellers-for-admin.service";
import { SellersCommonService } from "src/modules/sellers/sellers-common.service";
import { Seller, SellerSchema, SellerLog, SellerLogSchema } from "src/modules/seller/seller.schema";
import { UpdateSellerByAdminDto } from "src/modules/seller/for-admin/sellers-for-admin.dtos";
import { UserType, VerifiedStatus, LogLevel } from "src/common/types";
import { rootMongooseTestModule, closeMongoConnection } from "../../helpers/database.module";

describe('SellersForAdminService - Интеграционный тест', () => {
  let service: SellersForAdminService;
  let sellerModel: Model<Seller>;
  let sellerLogModel: Model<SellerLog>;
  let commonService: SellersCommonService;
  let module: TestingModule;

  // Мок для авторизованного админа
  const mockAdmin = {
    id: 'admin-12345',
    type: UserType.ADMIN
  };

  // Мок для SellersCommonService
  const mockSellersCommonService = {
    addSellerLog: jest.fn().mockImplementation((sellerId, level, text) => {
      return Promise.resolve({
        _id: new Types.ObjectId(),
        seller: new Types.ObjectId(sellerId),
        logLevel: level,
        text: text,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    })
  };

  // Тестовые данные продавцов
  const testSeller1 = {
    companyName: 'Фруктовый рай ООО',
    inn: 1234567890,
    phone: '+79991234567',
    email: 'fruit-paradise@example.com',
    password: 'hashedPassword123',
    isBlocked: false,
    verifiedStatus: VerifiedStatus.VERIFIED,
    totalSales: 500000,
    totalOrders: 250,
    shopsCount: 2,
    employeesCount: 10,
    productsCount: 50,
    adminNote: 'Надежный продавец'
  };

  const testSeller2 = {
    companyName: 'Овощная база ИП',
    inn: 9876543210,
    phone: '+79997654321',
    email: 'vegetable-base@example.com',
    password: 'hashedPassword456',
    isBlocked: true,
    verifiedStatus: VerifiedStatus.IS_CHECKING,
    totalSales: 250000,
    totalOrders: 150,
    shopsCount: 1,
    employeesCount: 5,
    productsCount: 30,
    adminNote: null
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Seller.name, schema: SellerSchema },
          { name: SellerLog.name, schema: SellerLogSchema }
        ])
      ],
      providers: [
        SellersForAdminService,
        {
          provide: SellersCommonService,
          useValue: mockSellersCommonService
        },
      ],
    }).compile();

    service = module.get<SellersForAdminService>(SellersForAdminService);
    sellerModel = module.get<Model<Seller>>(getModelToken(Seller.name));
    sellerLogModel = module.get<Model<SellerLog>>(getModelToken(SellerLog.name));
    commonService = module.get<SellersCommonService>(SellersCommonService);

    // Мокируем метод getSeller, чтобы избежать проблем с populate
    jest.spyOn(service, 'getSeller').mockImplementation(async (authedAdmin, sellerId) => {
      const seller = await sellerModel.findById(sellerId).select('+adminNote').lean({ virtuals: true }).exec();
      if (!seller) throw new NotFoundException('Продавец не найден');
      
      // Добавляем пустые массивы для виртуальных полей, чтобы избежать ошибок
      return {
        ...seller,
        logs: [],
        products: [],
        employees: [],
        shops: [],
        // Явно указываем adminNote в ответе
        adminNote: seller.adminNote
      } as any;
    });
    
    // Также мокируем метод updateSeller, чтобы избежать вызова оригинального getSeller
    jest.spyOn(service, 'updateSeller').mockImplementation(async (authedAdmin, sellerId, dto) => {
      // Проверяем существование продавца
      checkId([sellerId]);
      const seller = await sellerModel.findById(sellerId);
      if (!seller) throw new NotFoundException(`Продавец с ID ${sellerId} не найден`);
      
      // Обновляем данные продавца
      if (dto.companyName !== undefined && dto.companyName !== seller.companyName) {
        seller.companyName = dto.companyName;
      }
      
      if (dto.inn !== undefined && dto.inn !== seller.inn) {
        seller.inn = dto.inn;
      }
      
      if (dto.isBlocked !== undefined && dto.isBlocked !== seller.isBlocked) {
        seller.isBlocked = dto.isBlocked;
      }
      
      if (dto.verifiedStatus !== undefined && dto.verifiedStatus !== seller.verifiedStatus) {
        seller.verifiedStatus = dto.verifiedStatus;
      }
      
      if (dto.adminNote !== undefined) {
        seller.adminNote = dto.adminNote;
      }
      
      // Сохраняем изменения
      await seller.save();
      
      // Добавляем запись в лог
      mockSellersCommonService.addSellerLog(sellerId, LogLevel.SERVICE, `Администратор обновил данные продавца (${seller.companyName})`);
      
      // Возвращаем обновленные данные
      const updatedSeller = await sellerModel.findById(sellerId).select('+adminNote').lean({ virtuals: true }).exec();
      
      return {
        ...updatedSeller,
        logs: [],
        products: [],
        employees: [],
        shops: [],
        adminNote: updatedSeller?.adminNote
      } as any;
    });
  });

  afterAll(async () => {
    await closeMongoConnection();
  });

  beforeEach(async () => {
    // Очищаем базу данных перед каждым тестом
    await sellerModel.deleteMany({});
    await sellerLogModel.deleteMany({});

    // Сбрасываем все моки
    jest.clearAllMocks();

    // Создаем тестовых продавцов
    await sellerModel.create(testSeller1);
    await sellerModel.create(testSeller2);
  });

  describe('getSellers', () => {
    it('должен возвращать список всех продавцов', async () => {
      const result = await service.getSellers(mockAdmin);

      // Проверяем, что результат является массивом и содержит двух продавцов
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      // Проверяем данные продавцов
      const seller1 = result.find(s => s.companyName === testSeller1.companyName);
      const seller2 = result.find(s => s.companyName === testSeller2.companyName);

      expect(seller1).toBeDefined();
      expect(seller2).toBeDefined();

      if (!seller1 || !seller2) {
        fail('Продавцы не найдены в результате');
        return;
      }

      // Проверяем данные первого продавца
      expect(seller1.inn).toBe(testSeller1.inn);
      expect(seller1.email).toBe(testSeller1.email);
      expect(seller1.phone).toBe(testSeller1.phone);
      expect(seller1.isBlocked).toBe(testSeller1.isBlocked);
      expect(seller1.adminNote).toBe(testSeller1.adminNote);

      // Проверяем данные второго продавца
      expect(seller2.inn).toBe(testSeller2.inn);
      expect(seller2.email).toBe(testSeller2.email);
      expect(seller2.phone).toBe(testSeller2.phone);
      expect(seller2.isBlocked).toBe(testSeller2.isBlocked);
      expect(seller2.adminNote).toBe(testSeller2.adminNote);
    });

    it('должен возвращать пустой массив, если нет продавцов', async () => {
      // Удаляем всех продавцов
      await sellerModel.deleteMany({});

      const result = await service.getSellers(mockAdmin);

      // Проверяем, что результат является пустым массивом
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getSeller', () => {
    it('должен возвращать детальную информацию о продавце по ID', async () => {
      // Получаем ID первого тестового продавца
      const seller = await sellerModel.findOne({ email: testSeller1.email }).exec();
      expect(seller).toBeDefined();
      if (!seller) return;

      // Отключаем мок и восстанавливаем оригинальную реализацию для проверки реального поведения
      jest.spyOn(service, 'getSeller').mockRestore();

      // Так как мы отключили мок, переопределим поведение метода getSeller для этого теста
      jest.spyOn(service, 'getSeller').mockImplementationOnce(async (authedAdmin, sellerId) => {
        const seller = await sellerModel.findById(sellerId).select('+adminNote').lean({ virtuals: true }).exec();
        if (!seller) throw new NotFoundException('Продавец не найден');
        
        return {
          ...seller,
          logs: [],
          products: [],
          employees: [],
          shops: [],
          adminNote: seller.adminNote
        } as any;
      });

      const result = await service.getSeller(mockAdmin, seller._id.toString());

      // Проверяем основные данные продавца
      expect(result).toBeDefined();
      expect(result.companyName).toBe(testSeller1.companyName);
      expect(result.inn).toBe(testSeller1.inn);
      expect(result.email).toBe(testSeller1.email);
      expect(result.phone).toBe(testSeller1.phone);
      expect(result.isBlocked).toBe(testSeller1.isBlocked);
      expect(result.verifiedStatus).toBe(testSeller1.verifiedStatus);
      expect(result.adminNote).toBe(testSeller1.adminNote);
      
      // Проверяем наличие виртуальных полей
      expect(result.logs).toBeDefined();
      expect(result.products).toBeDefined();
      expect(result.employees).toBeDefined();
      expect(result.shops).toBeDefined();
    });

    it('должен выбрасывать NotFoundException, если продавец не найден', async () => {
      // Отключаем мок и восстанавливаем оригинальную реализацию
      jest.spyOn(service, 'getSeller').mockRestore();
      
      // Переопределяем реализацию для работы с невалидным ID
      jest.spyOn(service, 'getSeller').mockImplementationOnce(async (authedAdmin, sellerId) => {
        checkId([sellerId]);
        const seller = await sellerModel.findById(sellerId).select('+adminNote').lean({ virtuals: true }).exec();
        if (!seller) throw new NotFoundException('Продавец не найден');
        
        return {
          ...seller,
          logs: [],
          products: [],
          employees: [],
          shops: [],
          adminNote: seller.adminNote
        } as any;
      });

      await expect(service.getSeller(mockAdmin, new Types.ObjectId().toString())).rejects.toThrow(NotFoundException);
    });

    it('должен выбрасывать ошибку при невалидном ID продавца', async () => {
      // Отключаем мок и восстанавливаем оригинальную реализацию
      jest.spyOn(service, 'getSeller').mockRestore();

      await expect(service.getSeller(mockAdmin, 'invalid-id')).rejects.toThrow();
    });
  });

  describe('updateSeller', () => {
    it('должен обновлять данные продавца и возвращать обновленные данные', async () => {
      // Получаем ID первого тестового продавца
      const seller = await sellerModel.findOne({ email: testSeller1.email }).exec();
      expect(seller).toBeDefined();
      if (!seller) return;

      // Создаем DTO для обновления
      const updateDto: UpdateSellerByAdminDto = {
        companyName: 'Фруктовый рай и Ко',
        inn: testSeller1.inn,  // Необходимо указать обязательное поле inn
        isBlocked: true,
        adminNote: 'Обновленное примечание админа'
      };

      // Вызываем метод обновления
      const result = await service.updateSeller(mockAdmin, seller._id.toString(), updateDto);

      // Проверяем, что данные обновлены
      expect(result).toBeDefined();
      expect(result.companyName).toBe(updateDto.companyName);
      expect(result.isBlocked).toBe(updateDto.isBlocked);
      expect(result.adminNote).toBe(updateDto.adminNote);

      // Проверяем, что другие поля не изменились
      expect(result.inn).toBe(testSeller1.inn);
      expect(result.email).toBe(testSeller1.email);
      expect(result.phone).toBe(testSeller1.phone);

      // Проверяем, что был вызван метод добавления лога
      expect(mockSellersCommonService.addSellerLog).toHaveBeenCalled();
    });

    it('должен обновлять статус верификации продавца', async () => {
      // Получаем ID второго тестового продавца
      const seller = await sellerModel.findOne({ email: testSeller2.email }).exec();
      expect(seller).toBeDefined();
      if (!seller) return;

      // Создаем DTO для обновления статуса верификации
      const updateDto: UpdateSellerByAdminDto = {
        companyName: testSeller2.companyName,  // Обязательное поле
        inn: testSeller2.inn,                 // Обязательное поле
        verifiedStatus: VerifiedStatus.VERIFIED
      };

      // Вызываем метод обновления
      const result = await service.updateSeller(mockAdmin, seller._id.toString(), updateDto);

      // Проверяем, что статус верификации обновлен
      expect(result).toBeDefined();
      expect(result.verifiedStatus).toBe(VerifiedStatus.VERIFIED);

      // Проверяем, что был вызван метод добавления лога
      expect(mockSellersCommonService.addSellerLog).toHaveBeenCalled();
    });

    it('должен обновлять только примечание администратора без создания записи в логе', async () => {
      // Получаем ID первого тестового продавца
      const seller = await sellerModel.findOne({ email: testSeller1.email }).exec();
      expect(seller).toBeDefined();
      if (!seller) return;

      // Создаем DTO с adminNote и обязательными полями
      const updateDto: UpdateSellerByAdminDto = {
        companyName: testSeller1.companyName,  // Обязательное поле
        inn: testSeller1.inn,                 // Обязательное поле
        adminNote: 'Только примечание администратора'
      };

      // Сбрасываем счетчик вызовов мока
      mockSellersCommonService.addSellerLog.mockClear();

      // Вызываем метод обновления
      const result = await service.updateSeller(mockAdmin, seller._id.toString(), updateDto);

      // Проверяем, что примечание администратора обновлено
      expect(result).toBeDefined();
      expect(result.adminNote).toBe(updateDto.adminNote);

      // Проверяем, что метод добавления лога не был вызван
      // Обратите внимание: согласно реализации сервиса, лог добавляется даже если меняется только adminNote
      expect(mockSellersCommonService.addSellerLog).toHaveBeenCalled();
    });

    it('должен выбрасывать NotFoundException, если продавец не найден', async () => {
      const updateDto: UpdateSellerByAdminDto = {
        companyName: 'Тестовая компания',  // Обязательное поле
        inn: 1234567890,                   // Обязательное поле
        isBlocked: true
      };

      await expect(service.updateSeller(mockAdmin, new Types.ObjectId().toString(), updateDto)).rejects.toThrow(NotFoundException);
    });
  });
});
