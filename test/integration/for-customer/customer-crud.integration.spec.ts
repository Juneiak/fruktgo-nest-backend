import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from "@nestjs/mongoose";
import { Model, Types } from 'mongoose';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

import { rootMongooseTestModule, closeMongoConnection } from '../../helpers/database.module';
import { CustomersForCustomerService } from "src/modules/customer/for-customer/customers-for-customer.service";
import { Customer, CustomerSchema } from "src/modules/customer/schemas/customer.schema";
import { Cart, CartSchema } from "src/modules/customer/schemas/cart.schema";
import { Shop, ShopSchema } from "src/modules/shops/schemas/shop.schema";
import { ShopProduct, ShopProductSchema } from "src/modules/shops/schemas/shop-product.schema";
import { CreateAddressDto, UpdateCustomerDto } from "src/modules/customer/for-customer/customers-for-customer.dtos";
import { AuthenticatedUser, UserSex, UserType, VerifiedStatus } from "src/common/types";

describe('CustomersForCustomerService - Интеграционный тест управления клиентами', () => {
  let service: CustomersForCustomerService;
  let customerModel: Model<Customer>;
  
  // Тестовые данные
  let customerId: string;
  let authedCustomer: AuthenticatedUser;

  // Тестовые DTO
  const testAddressDto: CreateAddressDto = {
    address: 'Тестовая улица, 123'
  };

  // Тестовый пользователь с неправильной аутентификацией
  const wrongCustomerId = new Types.ObjectId().toString();
  const wrongCustomer: AuthenticatedUser = {
    id: wrongCustomerId,
    type: UserType.CUSTOMER
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: 'Customer', schema: CustomerSchema },
          { name: 'Cart', schema: CartSchema },
          { name: 'ShopProduct', schema: ShopProductSchema },
          { name: 'Shop', schema: ShopSchema }
        ])
      ],
      providers: [
        CustomersForCustomerService
      ],
    }).compile();

    service = module.get<CustomersForCustomerService>(CustomersForCustomerService);
    customerModel = module.get<Model<Customer>>(getModelToken('Customer'));
  });

  afterAll(async () => {
    await closeMongoConnection();
  });

  beforeEach(async () => {
    // Очищаем тестовые данные перед каждым тестом
    await customerModel.deleteMany({});
    
    // Создаем новый ID для каждого теста
    customerId = new Types.ObjectId().toString();
    authedCustomer = {
      id: customerId,
      type: UserType.CUSTOMER
    };

    // Создаем тестового клиента для использования в тесте
    await customerModel.create({
      _id: new Types.ObjectId(customerId),
      email: 'test@example.com',
      customerName: 'Тестовый Клиент',
      password: 'test123', // Обязательное поле в схеме
      isBlocked: false,
      verifiedStatus: VerifiedStatus.VERIFIED,
      savedAddresses: [],
      selectedAddressId: null,
      sex: UserSex.MALE,
      birthDate: new Date('1990-01-01')
    });
  });

  afterEach(async () => {
    // Дополнительная очистка после каждого теста (может быть избыточно, но безопаснее)
    await customerModel.deleteMany({});
  });

  describe('Управление адресами', () => {
    it('должен добавить новый адрес', async () => {
      const result = await service.addAddress(authedCustomer, customerId, testAddressDto);
      
      // Проверим что адрес добавлен
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].address).toBe(testAddressDto.address);
    });

    it('должен выбрасывать ошибку при добавлении адреса к несуществующему клиенту', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      
      // Должен выбросить NotFoundException
      await expect(service.addAddress(
        {...authedCustomer, id: nonExistentId}, 
        nonExistentId, 
        testAddressDto
      )).rejects.toThrow(NotFoundException);
    });

    it('должен выбрасывать ошибку при попытке добавить адрес к чужому аккаунту', async () => {
      // Должен выбросить UnauthorizedException
      await expect(service.addAddress(
        wrongCustomer, 
        customerId, 
        testAddressDto
      )).rejects.toThrow(UnauthorizedException);
    });

    it('должен выбрать адрес по умолчанию', async () => {
      // Сначала добавляем адрес
      await service.addAddress(authedCustomer, customerId, testAddressDto);
      
      // Получаем клиента, чтобы узнать ID добавленного адреса
      const customer = await customerModel.findById(customerId);
      if (!customer) throw new Error('Клиент не найден');
      const addressId = customer.savedAddresses[0]._id.toString();
      
      // Затем выбираем этот адрес
      const result = await service.selectAddress(authedCustomer, customerId, addressId);
      
      expect(result).toBeDefined();
      if (!result) throw new Error('Результат не определен');
      expect(result.address).toBe(testAddressDto.address);
      
      // Проверяем, что адрес действительно был выбран в БД
      const updatedCustomer = await customerModel.findById(customerId);
      if (!updatedCustomer || !updatedCustomer.selectedAddressId) throw new Error('Клиент или выбранный адрес не найден');
      expect(updatedCustomer.selectedAddressId.toString()).toBe(addressId);
    });

    it('должен удалить существующий адрес', async () => {
      // Сначала добавляем адрес
      await service.addAddress(authedCustomer, customerId, testAddressDto);
      
      // Получаем клиента, чтобы узнать ID добавленного адреса
      const customer = await customerModel.findById(customerId);
      if (!customer) throw new Error('Клиент не найден');
      const addressId = customer.savedAddresses[0]._id.toString();
      
      // Удаляем адрес
      const result = await service.deleteSavedAddress(authedCustomer, customerId, addressId);
      
      expect(result).toBeDefined();
      expect(result.length).toBe(0);
      
      // Проверяем, что адрес действительно был удален в БД
      const updatedCustomer = await customerModel.findById(customerId);
      if (!updatedCustomer) throw new Error('Клиент не найден');
      expect(updatedCustomer.savedAddresses.length).toBe(0);
      expect(updatedCustomer.selectedAddressId).toBeNull();
    });
  });

  describe('Управление профилем клиента', () => {
    it('должен получить информацию о клиенте', async () => {
      const result = await service.getCustomer(authedCustomer, customerId);
      
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.customerName).toBe('Тестовый Клиент');
    });

    it('должен обновить информацию о клиенте', async () => {
      const updateDto: UpdateCustomerDto = {
        customerName: 'Обновленное Имя',
        sex: UserSex.FEMALE,
        birthDate: new Date('1995-05-05')
      };
      
      const result = await service.updateCustomer(authedCustomer, customerId, updateDto);
      
      expect(result).toBeDefined();
      expect(result.customerName).toBe(updateDto.customerName);
      
      // Проверяем, что данные действительно были обновлены в БД
      const updatedCustomer = await customerModel.findById(customerId);
      if (!updatedCustomer) throw new Error('Клиент не найден');
      expect(updatedCustomer.customerName).toBe(updateDto.customerName);
      expect(updatedCustomer.sex).toBe(updateDto.sex);
      expect(updatedCustomer.birthDate).toEqual(updateDto.birthDate);
    });

    it('должен выбрасывать ошибку при обновлении несуществующего клиента', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const updateDto: UpdateCustomerDto = {
        customerName: 'Обновленное Имя'
      };
      
      // Должен выбросить NotFoundException
      await expect(service.updateCustomer(
        {...authedCustomer, id: nonExistentId}, 
        nonExistentId, 
        updateDto
      )).rejects.toThrow(NotFoundException);
    });

    it('должен выбрасывать ошибку при попытке обновить чужой профиль', async () => {
      const updateDto: UpdateCustomerDto = {
        customerName: 'Хакерское Имя'
      };
      
      // Должен выбросить UnauthorizedException
      await expect(service.updateCustomer(
        wrongCustomer, 
        customerId, 
        updateDto
      )).rejects.toThrow(UnauthorizedException);
    });
  });
});
