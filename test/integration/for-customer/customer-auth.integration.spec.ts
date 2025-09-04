import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Model } from 'mongoose';

import { CustomerAuthService } from 'src/modules/auth/customer-auth/customer-auth.service';
import { Customer, CustomerSchema } from 'src/modules/customer/schemas/customer.schema';
import { Cart, CartSchema } from 'src/modules/customer/schemas/cart.schema';
import { RegisterCustomerDto, LoginCustomerDto } from 'src/modules/auth/customer-auth/customer-auth.response.dto';
import { rootMongooseTestModule, closeMongoConnection } from '../../helpers/database.module';

describe('CustomerAuthService - Интеграционный тест', () => {
  let service: CustomerAuthService;
  let customerModel: Model<Customer>;
  let cartModel: Model<Cart>;
  let jwtService: JwtService;
  let module: TestingModule;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Customer.name, schema: CustomerSchema },
          { name: Cart.name, schema: CartSchema }
        ])
      ],
      providers: [
        CustomerAuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<CustomerAuthService>(CustomerAuthService);
    customerModel = module.get<Model<Customer>>(getModelToken(Customer.name));
    cartModel = module.get<Model<Cart>>(getModelToken(Cart.name));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await closeMongoConnection();
  });

  beforeEach(async () => {
    // Очищаем базу данных перед каждым тестом
    await customerModel.deleteMany({});
    await cartModel.deleteMany({});
    // Сбрасываем моки
    jest.clearAllMocks();
  });

  describe('Регистрация клиента', () => {
    const registerDto: RegisterCustomerDto = {
      email: 'test@example.com',
      password: 'password123',
      customerName: 'Тест Тестович',
      phone: '+79991234567',
    };

    it('должен успешно зарегистрировать нового клиента и создать для него корзину', async () => {
      // Вызываем метод регистрации
      const result = await service.register(registerDto);

      // Проверяем, что JWT был подписан
      expect(jwtService.sign).toHaveBeenCalled();

      // Проверяем формат ответа
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('customer');
      expect(result.token).toBe('test-token');
      expect(result.customer).toHaveProperty('customerId');
      expect(result.customer).toHaveProperty('email', registerDto.email);
      expect(result.customer).toHaveProperty('customerName', registerDto.customerName);

      // Проверяем, что клиент действительно был сохранен в базу данных
      const savedCustomer = await customerModel.findOne({ email: registerDto.email });
      expect(savedCustomer).toBeTruthy();
      
      // Добавляем явную проверку для TypeScript
      if (!savedCustomer) {
        fail('Клиент не был сохранен в базу данных');
        return;
      }
      
      expect(savedCustomer.customerName).toBe(registerDto.customerName);
      expect(savedCustomer.cart).toBeTruthy(); // Проверяем, что корзина была создана и привязана

      // Проверяем, что корзина была создана в базе данных
      const cart = await cartModel.findById(savedCustomer.cart);
      expect(cart).toBeTruthy();
      
      // Аналогичная проверка для cart
      if (!cart) {
        fail('Корзина не была создана в базе данных');
        return;
      }
      if (!cart.customer) {
        fail('Клиент не имеет корзины');
        return;
      }
      
      expect(cart.customer.toString()).toBe(savedCustomer.customerId.toString()); // Проверяем связь корзины с клиентом
    });

    it('должен выбросить BadRequestException при попытке регистрации с существующим email', async () => {
      // Сначала регистрируем клиента
      await service.register(registerDto);

      // Пытаемся зарегистрировать еще одного клиента с тем же email
      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Пользователь с таким email уже существует');

      // Проверяем, что в базе данных только один клиент с таким email
      const count = await customerModel.countDocuments({ email: registerDto.email });
      expect(count).toBe(1);
    });

    it('должен создать клиента с захешированным паролем', async () => {
      await service.register(registerDto);
      
      const savedCustomer = await customerModel.findOne({ email: registerDto.email });
      
      // Добавляем явную проверку для TypeScript
      if (!savedCustomer) {
        fail('Клиент не был сохранен в базу данных');
        return;
      }
      
      expect(savedCustomer.password).not.toBe(registerDto.password);
      expect(savedCustomer.password).toMatch(/^\$2[aby]\$\d+\$/); // Проверяем формат bcrypt хеша
    });
  });

  describe('Авторизация клиента', () => {
    const registerDto: RegisterCustomerDto = {
      email: 'test@example.com',
      password: 'password123',
      customerName: 'Тест Тестович',
      phone: '+79991234567',
    };

    const loginDto: LoginCustomerDto = {
      email: 'test@example.com',
      password: 'password123',
      phone: '+79991234567',
    };

    beforeEach(async () => {
      // Регистрируем пользователя перед каждым тестом входа
      await service.register(registerDto);
    });

    it('должен успешно войти с правильными учетными данными', async () => {
      const result = await service.login(loginDto);

      // Проверяем формат ответа
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('customer');
      expect(result.token).toBe('test-token');
      expect(result.customer).toHaveProperty('customerId');
      expect(result.customer).toHaveProperty('email', loginDto.email);
    });

    it('должен обновить lastLoginAt при успешном входе', async () => {
      // Сохраняем текущее время для сравнения
      const beforeLogin = new Date();
      
      // Ждем 10 мс, чтобы быть уверенным, что lastLoginAt будет отличаться
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await service.login(loginDto);
      
      const customer = await customerModel.findOne({ email: loginDto.email });
      
      // Добавляем явную проверку для TypeScript
      if (!customer) {
        fail('Клиент не был найден в базе данных');
        return;
      }
      
      expect(customer.lastLoginAt).toBeTruthy();
      if (!customer.lastLoginAt) {
        fail('lastLoginAt не был обновлен');
        return;
      }
      // Проверяем, что lastLoginAt обновлено и больше чем beforeLogin
      const lastLoginTime = new Date(customer.lastLoginAt).getTime();
      const beforeLoginTime = beforeLogin.getTime();
      expect(lastLoginTime).toBeGreaterThan(beforeLoginTime);
    });

    it('должен выбросить UnauthorizedException при входе с неверным паролем', async () => {
      const wrongPasswordDto = { ...loginDto, password: 'wrongpassword' };
      
      await expect(service.login(wrongPasswordDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(wrongPasswordDto)).rejects.toThrow('Неверный email или пароль');
    });

    it('должен выбросить UnauthorizedException при входе с несуществующим email', async () => {
      const nonExistentEmailDto = { ...loginDto, email: 'nonexistent@example.com' };
      
      await expect(service.login(nonExistentEmailDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(nonExistentEmailDto)).rejects.toThrow('Неверный email или пароль');
    });
  });

  describe('Полный цикл регистрации и входа', () => {
    it('должен позволить клиенту зарегистрироваться и войти', async () => {
      // Данные для регистрации
      const registerDto: RegisterCustomerDto = {
        email: 'fullflow@example.com',
        password: 'securePassword123',
        customerName: 'Полный Цикл',
        phone: '+79991234567',
      };

      // Данные для входа
      const loginDto: LoginCustomerDto = {
        email: 'fullflow@example.com',
        password: 'securePassword123',
        phone: '+79991234567',
      };

      // Регистрация
      const registerResult = await service.register(registerDto);
      expect(registerResult).toHaveProperty('token');
      expect(registerResult.customer).toHaveProperty('email', registerDto.email);

      // Сбрасываем мок для проверки нового вызова при входе
      jest.clearAllMocks();

      // Вход
      const loginResult = await service.login(loginDto);
      expect(loginResult).toHaveProperty('token');
      expect(loginResult.customer).toHaveProperty('email', loginDto.email);

      // Проверяем, что JWT подписан
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
    
      // Проверяем обновление lastLoginAt
      const customer = await customerModel.findOne({ email: loginDto.email });
      if (!customer) {
        fail('Клиент не был найден в базе данных');
        return;
      }
      expect(customer.lastLoginAt).toBeTruthy();
      
    });
  });
});
