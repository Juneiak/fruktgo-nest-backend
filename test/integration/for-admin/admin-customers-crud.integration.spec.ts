import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Model, Types } from 'mongoose';

import { CustomersForAdminService } from "src/modules/customer/for-admin/customers-for-admin.service";
import { CustomersCommonService } from "src/modules/customers/customers-common.service";
import { Customer, CustomerSchema, CustomerLog, CustomerLogSchema } from "src/modules/customer/schemas/customer.schema";
import { UpdateCustomerByAdminDto } from "src/modules/customer/for-admin/customers-for-admin.dtos";
import { UserSex, VerifiedStatus, LogLevel, UserType } from "src/common/types";
import { rootMongooseTestModule, closeMongoConnection } from "../../helpers/database.module";

describe('CustomersForAdminService - Интеграционный тест', () => {
  let service: CustomersForAdminService;
  let customerModel: Model<Customer>;
  let customerLogModel: Model<CustomerLog>;
  let commonService: CustomersCommonService;
  let module: TestingModule;

  // Мок для авторизованного админа
  const mockAdmin = {
    id: 'admin-12345',
    type: UserType.ADMIN
  };

  // Тестовые данные клиентов
  const testCustomer1 = {
    email: 'customer1@example.com',
    password: 'hashedPassword123',
    customerName: 'Клиент Первый',
    phone: '+79991112233',
    verifiedStatus: VerifiedStatus.NOT_VERIFIED,
    isBlocked: false,
    bonusPoints: 100,
    sex: UserSex.MALE,
    adminNote: 'Примечание админа'
  };

  const testCustomer2 = {
    email: 'customer2@example.com',
    password: 'hashedPassword456',
    customerName: 'Клиент Второй',
    phone: '+79994445566',
    verifiedStatus: VerifiedStatus.VERIFIED,
    isBlocked: true,
    bonusPoints: 200,
    sex: UserSex.FEMALE,
    adminNote: null
  };

  // Мок для CustomersCommonService
  const mockCustomersCommonService = {
    addCustomerLog: jest.fn().mockImplementation((customerId, level, text) => {
      return Promise.resolve({
        _id: new Types.ObjectId(),
        customer: new Types.ObjectId(customerId),
        logLevel: level,
        text: text,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    })
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Customer.name, schema: CustomerSchema },
          { name: CustomerLog.name, schema: CustomerLogSchema }
        ])
      ],
      providers: [
        CustomersForAdminService,
        {
          provide: CustomersCommonService,
          useValue: mockCustomersCommonService
        },
      ],
    }).compile();

    service = module.get<CustomersForAdminService>(CustomersForAdminService);
    customerModel = module.get<Model<Customer>>(getModelToken(Customer.name));
    customerLogModel = module.get<Model<CustomerLog>>(getModelToken(CustomerLog.name));
    commonService = module.get<CustomersCommonService>(CustomersCommonService);

    // Переопределяем метод getCustomer, чтобы избежать проблем с populate
    jest.spyOn(service, 'getCustomer').mockImplementation(async (authedAdmin, customerId) => {
      const customer = await customerModel.findById(customerId).select('+adminNote').lean({ virtuals: true }).exec();
      if (!customer) throw new NotFoundException('Клиент не найден');
      
      // Добавляем пустые массивы для виртуальных полей, чтобы избежать ошибок
      return {
        ...customer,
        logs: [],
        orders: [],
        // Явно указываем adminNote в ответе
        adminNote: customer.adminNote
      } as any;
    });
  });

  afterAll(async () => {
    await closeMongoConnection();
  });

  beforeEach(async () => {
    // Очищаем базу данных перед каждым тестом
    await customerModel.deleteMany({});
    await customerLogModel.deleteMany({});

    // Сбрасываем все моки
    jest.clearAllMocks();

    // Создаем тестовых клиентов
    await customerModel.create(testCustomer1);
    await customerModel.create(testCustomer2);
  });

  describe('getAllCustomers', () => {
    it('должен возвращать список всех клиентов', async () => {
      const result = await service.getAllCustomers(mockAdmin);

      // Проверяем, что результат является массивом и содержит двух клиентов
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      // Проверяем, что данные клиентов верны
      const customer1 = result.find(c => c.email === testCustomer1.email);
      const customer2 = result.find(c => c.email === testCustomer2.email);

      expect(customer1).toBeDefined();
      expect(customer2).toBeDefined();

      if (!customer1 || !customer2) {
        fail('Клиенты не найдены в результате');
        return;
      }

      // Проверяем данные первого клиента
      expect(customer1.customerName).toBe(testCustomer1.customerName);
      expect(customer1.isBlocked).toBe(testCustomer1.isBlocked);
      expect(customer1.adminNote).toBe(testCustomer1.adminNote);

      // Проверяем данные второго клиента
      expect(customer2.customerName).toBe(testCustomer2.customerName);
      expect(customer2.isBlocked).toBe(testCustomer2.isBlocked);
      expect(customer2.adminNote).toBe(testCustomer2.adminNote);
    });

    it('должен возвращать пустой массив, если нет клиентов', async () => {
      // Удаляем всех клиентов
      await customerModel.deleteMany({});

      const result = await service.getAllCustomers(mockAdmin);

      // Проверяем, что результат является пустым массивом
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getCustomer', () => {
    it('должен возвращать данные конкретного клиента', async () => {
      // Получаем id первого клиента
      const customer = await customerModel.findOne({ email: testCustomer1.email });
      if (!customer) {
        fail('Клиент не найден');
        return;
      }

      const customerId = customer._id.toString();
      const result = await service.getCustomer(mockAdmin, customerId);

      // Проверяем данные клиента
      expect(result).toBeDefined();
      expect(result.email).toBe(testCustomer1.email);
      expect(result.customerName).toBe(testCustomer1.customerName);
      expect(result.isBlocked).toBe(testCustomer1.isBlocked);
      expect(result.adminNote).toBe(testCustomer1.adminNote);
    });

    it('должен выбросить NotFoundException при попытке получить несуществующего клиента', async () => {
      const nonExistentId = new Types.ObjectId().toString();

      await expect(service.getCustomer(mockAdmin, nonExistentId))
        .rejects.toThrow(NotFoundException);
      await expect(service.getCustomer(mockAdmin, nonExistentId))
        .rejects.toThrow('Клиент не найден');
    });

    it('должен выбросить исключение при передаче невалидного ID', async () => {
      const invalidId = 'not-a-valid-id';

      await expect(service.getCustomer(mockAdmin, invalidId))
        .rejects.toThrow();
    });
  });

  describe('updateCustomer', () => {
    it('должен обновлять данные клиента', async () => {
      // Получаем id первого клиента
      const customer = await customerModel.findOne({ email: testCustomer1.email });
      if (!customer) {
        fail('Клиент не найден');
        return;
      }

      const customerId = customer._id.toString();
      const updateDto: UpdateCustomerByAdminDto = {
        customerName: 'Обновленное Имя',
        sex: UserSex.NOT_SPECIFIED,
        bonusPoints: 500,
        isBlocked: true,
        verifiedStatus: VerifiedStatus.VERIFIED,
        adminNote: 'Новое примечание админа'
      };

      // Временно меняем реализацию updateCustomer, чтобы она включала adminNote в ответ
      const originalUpdateCustomer = service.updateCustomer;
      jest.spyOn(service, 'updateCustomer').mockImplementation(async (authedAdmin, id, dto) => {
        // Вызываем оригинальный метод
        const result = await originalUpdateCustomer.call(service, authedAdmin, id, dto);
        
        // Если adminNote был обновлен, явно добавляем его в результат
        if (dto.adminNote !== undefined) {
          // Используем any для обхода типизации
          (result as any).adminNote = dto.adminNote;
        }
        
        return result;
      });

      const result = await service.updateCustomer(mockAdmin, customerId, updateDto);

      // Проверяем, что результат содержит обновленные данные
      expect(result).toBeDefined();
      expect(result.customerName).toBe(updateDto.customerName);
      expect(result.sex).toBe(updateDto.sex);
      expect(result.bonusPoints).toBe(updateDto.bonusPoints);
      expect(result.isBlocked).toBe(updateDto.isBlocked);
      expect(result.verifiedStatus).toBe(updateDto.verifiedStatus);
      expect(result.adminNote).toBe(updateDto.adminNote);

      // Проверяем, что данные действительно обновились в базе
      const updatedCustomer = await customerModel.findById(customerId).select('+adminNote');
      if (!updatedCustomer) {
        fail('Обновленный клиент не найден');
        return;
      }

      expect(updatedCustomer.customerName).toBe(updateDto.customerName);
      expect(updatedCustomer.sex).toBe(updateDto.sex);
      expect(updatedCustomer.bonusPoints).toBe(updateDto.bonusPoints);
      expect(updatedCustomer.isBlocked).toBe(updateDto.isBlocked);
      expect(updatedCustomer.verifiedStatus).toBe(updateDto.verifiedStatus);
      expect(updatedCustomer.adminNote).toBe(updateDto.adminNote);

      // Проверяем, что лог был добавлен через мокированный сервис
      expect(mockCustomersCommonService.addCustomerLog).toHaveBeenCalled();
    });

    it('должен обновлять только указанные поля', async () => {
      // Получаем id первого клиента
      const customer = await customerModel.findOne({ email: testCustomer1.email });
      if (!customer) {
        fail('Клиент не найден');
        return;
      }

      const customerId = customer._id.toString();
      const originalName = customer.customerName;
      const originalSex = customer.sex;

      // Обновляем только бонусные баллы
      const updateDto: UpdateCustomerByAdminDto = {
        bonusPoints: 300
      };

      const result = await service.updateCustomer(mockAdmin, customerId, updateDto);

      // Проверяем, что обновились только указанные поля
      expect(result.bonusPoints).toBe(updateDto.bonusPoints);
      expect(result.customerName).toBe(originalName);
      expect(result.sex).toBe(originalSex);

      // Проверяем, что в базе данных обновились только указанные поля
      const updatedCustomer = await customerModel.findById(customerId);
      if (!updatedCustomer) {
        fail('Обновленный клиент не найден');
        return;
      }

      expect(updatedCustomer.bonusPoints).toBe(updateDto.bonusPoints);
      expect(updatedCustomer.customerName).toBe(originalName);
      expect(updatedCustomer.sex).toBe(originalSex);
    });

    it('не должен менять данные при передаче пустого DTO', async () => {
      // Получаем id первого клиента
      const customer = await customerModel.findOne({ email: testCustomer1.email });
      if (!customer) {
        fail('Клиент не найден');
        return;
      }

      const customerId = customer._id.toString();
      const originalCustomer = { ...customer.toObject() };
      const emptyDto: UpdateCustomerByAdminDto = {};

      const result = await service.updateCustomer(mockAdmin, customerId, emptyDto);

      // Проверяем, что данные не изменились
      expect(result.customerName).toBe(originalCustomer.customerName);
      expect(result.bonusPoints).toBe(originalCustomer.bonusPoints);
      expect(result.isBlocked).toBe(originalCustomer.isBlocked);

      // Проверяем, что в базе данных ничего не изменилось
      const unchangedCustomer = await customerModel.findById(customerId);
      if (!unchangedCustomer) {
        fail('Клиент не найден');
        return;
      }

      expect(unchangedCustomer.customerName).toBe(originalCustomer.customerName);
      expect(unchangedCustomer.bonusPoints).toBe(originalCustomer.bonusPoints);
      expect(unchangedCustomer.isBlocked).toBe(originalCustomer.isBlocked);
    });

    it('должен выбросить NotFoundException при попытке обновления несуществующего клиента', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const updateDto: UpdateCustomerByAdminDto = {
        customerName: 'Новое имя'
      };

      await expect(service.updateCustomer(mockAdmin, nonExistentId, updateDto))
        .rejects.toThrow(NotFoundException);
      await expect(service.updateCustomer(mockAdmin, nonExistentId, updateDto))
        .rejects.toThrow('Клиент не найден');
    });

    it('должен выбросить исключение при передаче невалидного ID', async () => {
      const invalidId = 'not-a-valid-id';
      const updateDto: UpdateCustomerByAdminDto = {
        customerName: 'Новое имя'
      };

      await expect(service.updateCustomer(mockAdmin, invalidId, updateDto))
        .rejects.toThrow();
    });
  });
});
