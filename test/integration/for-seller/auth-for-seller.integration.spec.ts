import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { getModelToken } from "@nestjs/mongoose";
import { MongooseModule } from "@nestjs/mongoose";
import { BadRequestException, UnauthorizedException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { Model, Types } from "mongoose";

// Сервисы авторизации
import { SellerAuthService } from "src/interface/http/shop/auth/shop.auth.role.service";
import { EmployeeAuthService } from "src/modules/auth/employee-auth/employee-auth.service";
import { ShopAuthService } from "src/modules/auth/shop-auth/shop-auth.service";

// Схемы
import { Seller, SellerSchema } from "src/modules/seller/seller.schema";
import { Employee, EmployeeSchema } from "src/modules/employees/employee.schema";
import { Shop, ShopSchema } from "src/modules/shops/schemas/shop.schema";

// DTO
import { RegisterSellerDto, LoginSellerDto } from "src/interface/http/shop/auth/shop.auth.request.dtos";
import { RegisterEmployeeDto } from "src/modules/auth/employee-auth/employee-auth.response.dto";
import { RegisterShopDto, LoginShopDto } from "src/modules/auth/shop-auth/shop-auth.dtos";

// Общие типы
import { AuthenticatedUser, UserType } from "src/common/types";
import { rootMongooseTestModule, closeMongoConnection } from "../../helpers/database.module";

describe('Интеграционные тесты авторизации и регистрации', () => {
  
  afterAll(async () => {
    await closeMongoConnection();
  });

  // ================================================================================
  // 1. Тесты для авторизации и регистрации продавца продавцом
  // ================================================================================
  describe('Продавец - Регистрация и авторизация', () => {
    let sellerAuthService: SellerAuthService;
    let sellerModel: Model<Seller>;
    let jwtService: JwtService;
    let moduleRef: TestingModule;
  
    const mockJwtService = {
      sign: jest.fn().mockReturnValue('test-token'),
    };
  
    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          rootMongooseTestModule(),
          MongooseModule.forFeature([
            { name: Seller.name, schema: SellerSchema }
          ])
        ],
        providers: [
          SellerAuthService,
          {
            provide: JwtService,
            useValue: mockJwtService,
          },
        ],
      }).compile();
  
      sellerAuthService = moduleRef.get<SellerAuthService>(SellerAuthService);
      sellerModel = moduleRef.get<Model<Seller>>(getModelToken(Seller.name));
      jwtService = moduleRef.get<JwtService>(JwtService);
    });
  
    afterAll(async () => {
      await moduleRef.close();
    });
  
    beforeEach(async () => {
      // Очищаем коллекцию перед каждым тестом
      await sellerModel.deleteMany({});
      jest.clearAllMocks();
    });

    describe('Регистрация продавца', () => {
      const registerDto: RegisterSellerDto = {
        email: 'seller@example.com',
        password: 'password123',
        companyName: 'Фруктовая компания',
        inn: 1234567890,
        phone: '+79991234567'
      };

      it('успешно регистрирует продавца', async () => {
        // Вызываем метод регистрации
        const result = await sellerAuthService.register(registerDto);
        
        // Проверяем, что JWT был подписан
        expect(jwtService.sign).toHaveBeenCalled();
        
        // Проверяем формат ответа
        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('seller');
        expect(result.token).toBe('test-token');
        expect(result.seller).toHaveProperty('sellerId');
        expect(result.seller).toHaveProperty('email', registerDto.email);
  
        // Проверяем, что продавец действительно был сохранен в базу данных
        const savedSeller = await sellerModel.findOne({ email: registerDto.email });
        expect(savedSeller).toBeTruthy();
        
        // Добавляем явную проверку для TypeScript
        if (!savedSeller) {
          fail('Продавец не был сохранен в базу данных');
          return;
        }
        
        expect(savedSeller.email).toBe(registerDto.email);
        expect(savedSeller.companyName).toBe(registerDto.companyName);
        expect(savedSeller.inn).toBe(registerDto.inn);
        expect(savedSeller.phone).toBe(registerDto.phone);
      });

      it('должен выбросить BadRequestException при попытке регистрации с существующим email', async () => {
        // Сначала регистрируем продавца
        await sellerAuthService.register(registerDto);

        // Пытаемся зарегистрировать еще одного продавца с тем же email
        await expect(sellerAuthService.register(registerDto)).rejects.toThrow(BadRequestException);
        await expect(sellerAuthService.register(registerDto)).rejects.toThrow('Пользователь с таким email уже существует');
      });

      it('хеширует пароль перед сохранением', async () => {
        // Регистрируем продавца
        await sellerAuthService.register(registerDto);
        
        const savedSeller = await sellerModel.findOne({ email: registerDto.email });
        
        // Добавляем явную проверку для TypeScript
        if (!savedSeller) {
          fail('Продавец не был сохранен в базу данных');
          return;
        }
        
        expect(savedSeller.password).not.toBe(registerDto.password);
        expect(savedSeller.password).toMatch(/^\$2[aby]\$\d+\$/); // Проверяем формат bcrypt хеша
      });
    });

    describe('Авторизация продавца', () => {
      const registerDto: RegisterSellerDto = {
        email: 'seller@example.com',
        password: 'password123',
        companyName: 'Фруктовая компания',
        inn: 1234567890,
        phone: '+79991234567'
      };

      const loginDto: LoginSellerDto = {
        email: 'seller@example.com',
        password: 'password123',
      };

      beforeEach(async () => {
        // Регистрируем продавца перед каждым тестом на авторизацию
        await sellerAuthService.register(registerDto);
      });

      it('возвращает токен и данные продавца при успешной авторизации', async () => {
        const result = await sellerAuthService.login(loginDto);
        
        // Проверяем формат ответа
        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('seller');
        expect(result.token).toBe('test-token');
        expect(result.seller).toHaveProperty('sellerId');
        expect(result.seller).toHaveProperty('email', loginDto.email);
      });

      it('обновляет lastLoginAt при успешной авторизации', async () => {
        const beforeLogin = new Date();
        
        // Небольшая задержка для обеспечения разницы в timestamp
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await sellerAuthService.login(loginDto);
        
        const seller = await sellerModel.findOne({ email: loginDto.email });
        
        // Добавляем явную проверку для TypeScript
        if (!seller) {
          fail('Продавец не был найден в базе данных');
          return;
        }
        
        expect(seller.lastLoginAt).toBeTruthy();
        if (!seller.lastLoginAt) {
          fail('lastLoginAt не был обновлен');
          return;
        }
        
        // Проверяем, что lastLoginAt обновлено и больше чем beforeLogin
        const lastLoginTime = new Date(seller.lastLoginAt).getTime();
        const beforeLoginTime = beforeLogin.getTime();
        expect(lastLoginTime).toBeGreaterThan(beforeLoginTime);
      });

      it('выбрасывает UnauthorizedException при неверном пароле', async () => {
        const wrongLoginDto = { ...loginDto, password: 'wrongpassword' };
        
        await expect(sellerAuthService.login(wrongLoginDto)).rejects.toThrow(UnauthorizedException);
        await expect(sellerAuthService.login(wrongLoginDto)).rejects.toThrow('Неверный email или пароль');
      });

      it('выбрасывает UnauthorizedException при неверном email', async () => {
        const wrongLoginDto = { ...loginDto, email: 'wrong@example.com' };
        
        await expect(sellerAuthService.login(wrongLoginDto)).rejects.toThrow(UnauthorizedException);
        await expect(sellerAuthService.login(wrongLoginDto)).rejects.toThrow('Неверный email или пароль');
      });
    });

    describe('Полный цикл регистрации и авторизации', () => {
      const registerDto: RegisterSellerDto = {
        email: 'full-cycle@example.com',
        password: 'password123',
        companyName: 'Полный цикл',
        inn: 9876543210,
        phone: '+79991234567'
      };

      const loginDto: LoginSellerDto = {
        email: 'full-cycle@example.com',
        password: 'password123',
      };

      it('успешно проходит полный цикл регистрации и авторизации', async () => {
        // Шаг 1: Регистрация
        await sellerAuthService.register(registerDto);
        
        // Проверяем, что продавец создан
        const sellerAfterRegister = await sellerModel.findOne({ email: registerDto.email });
        expect(sellerAfterRegister).toBeTruthy();
        
        // Шаг 2: Авторизация
        const result = await sellerAuthService.login(loginDto);
        
        // Проверяем успешную авторизацию
        expect(result.token).toBe('test-token');
        expect(result.seller.email).toBe(loginDto.email);

        // Проверяем, что JWT подписан
        expect(jwtService.sign).toHaveBeenCalledTimes(2); // Один раз при регистрации, второй при входе
      
        // Проверяем обновление lastLoginAt
        const seller = await sellerModel.findOne({ email: loginDto.email });
        if (!seller) {
          fail('Продавец не был найден в базе данных');
          return;
        }
        expect(seller.lastLoginAt).toBeTruthy();
      });
    });
  });
  
  // ================================================================================
  // 2. Тесты для регистрации сотрудников продавцом
  // ================================================================================
  describe('Сотрудник - Регистрация', () => {
    let employeeAuthService: EmployeeAuthService;
    let employeeModel: Model<Employee>;
    let sellerModel: Model<Seller>;
    let jwtService: JwtService;
    let moduleRef: TestingModule;

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('test-token'),
    };

    // Мок для авторизованного продавца
    const authedSeller: AuthenticatedUser = {
      id: '123456789012345678901234', // Валидный ObjectId
      type: UserType.SELLER
    };

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          rootMongooseTestModule(),
          MongooseModule.forFeature([
            { name: Employee.name, schema: EmployeeSchema },
            { name: Seller.name, schema: SellerSchema },
            { name: Shop.name, schema: ShopSchema }
          ])
        ],
        providers: [
          EmployeeAuthService,
          {
            provide: JwtService,
            useValue: mockJwtService,
          },
        ],
      }).compile();

      employeeAuthService = moduleRef.get<EmployeeAuthService>(EmployeeAuthService);
      employeeModel = moduleRef.get<Model<Employee>>(getModelToken(Employee.name));
      sellerModel = moduleRef.get<Model<Seller>>(getModelToken(Seller.name));
      jwtService = moduleRef.get<JwtService>(JwtService);
    });

    afterAll(async () => {
      await moduleRef.close();
    });

    beforeEach(async () => {
      // Очищаем коллекции перед каждым тестом
      await employeeModel.deleteMany({});
      await sellerModel.deleteMany({});
      jest.clearAllMocks();
      
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

    describe('Регистрация сотрудника', () => {
      const registerDto: RegisterEmployeeDto = {
        phone: '+79991234567',
        employeeName: 'Тест Тестович',
        password: 'password123'
      };

      it('успешно регистрирует сотрудника', async () => {
        // Вызываем метод регистрации
        const result = await employeeAuthService.register(registerDto, authedSeller);
        
        // Проверяем, что JWT был подписан
        expect(jwtService.sign).toHaveBeenCalled();
        
        // Проверяем формат ответа
        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('employee');
        expect(result.token).toBe('test-token');
        expect(result.employee).toHaveProperty('employeeId');
        expect(result.employee).toHaveProperty('phone', registerDto.phone);
        expect(result.employee).toHaveProperty('employeeName', registerDto.employeeName);

        // Проверяем, что сотрудник действительно был сохранен в базу данных
        const savedEmployee = await employeeModel.findOne({ phone: registerDto.phone });
        expect(savedEmployee).toBeTruthy();
        
        // Добавляем явную проверку для TypeScript
        if (!savedEmployee) {
          fail('Сотрудник не был сохранен в базу данных');
          return;
        }
        
        expect(savedEmployee.employeeName).toBe(registerDto.employeeName);
        expect(savedEmployee.employer.toString()).toBe(authedSeller.id);
      });

      it('хеширует пароль перед сохранением', async () => {
        // Регистрируем сотрудника
        await employeeAuthService.register(registerDto, authedSeller);
        
        const savedEmployee = await employeeModel.findOne({ phone: registerDto.phone });
        
        // Добавляем явную проверку для TypeScript
        if (!savedEmployee) {
          fail('Сотрудник не был сохранен в базу данных');
          return;
        }
        
        expect(savedEmployee.password).not.toBe(registerDto.password);
        expect(savedEmployee.password).toMatch(/^\$2[aby]\$\d+\$/); // Проверяем формат bcrypt хеша
      });

      it('должен выбросить BadRequestException при попытке регистрации с существующим номером телефона', async () => {
        // Сначала регистрируем сотрудника
        await employeeAuthService.register(registerDto, authedSeller);

        // Пытаемся зарегистрировать еще одного сотрудника с тем же телефоном
        await expect(employeeAuthService.register(registerDto, authedSeller)).rejects.toThrow(BadRequestException);
        await expect(employeeAuthService.register(registerDto, authedSeller)).rejects.toThrow(`Сотрудник с номером ${registerDto.phone} уже зарегистрирован у вас`);
      });

      it('должен выбросить NotFoundException если продавец не найден', async () => {
        // Создаем несуществующего продавца
        const nonExistingSeller: AuthenticatedUser = {
          id: '507f1f77bcf86cd799439011', // Валидный но несуществующий ObjectId
          type: UserType.SELLER
        };

        // Попытка зарегистрировать сотрудника с несуществующим продавцом
        await expect(employeeAuthService.register(registerDto, nonExistingSeller)).rejects.toThrow(NotFoundException);
        await expect(employeeAuthService.register(registerDto, nonExistingSeller)).rejects.toThrow('Продавец не найден');
      });
    });
  });
  
  // ================================================================================
  // 3. Тесты для регистрации магазинов продавцом
  // ================================================================================
  describe('Магазин - Регистрация', () => {
    let shopAuthService: ShopAuthService;
    let shopModel: Model<Shop>;
    let sellerModel: Model<Seller>;
    let jwtService: JwtService;
    let moduleRef: TestingModule;

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('test-token'),
    };

    // Мок для авторизованного продавца
    const authedSeller: AuthenticatedUser = {
      id: '123456789012345678901234', // Валидный ObjectId
      type: UserType.SELLER
    };

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          rootMongooseTestModule(),
          MongooseModule.forFeature([
            { name: Shop.name, schema: ShopSchema },
            { name: Seller.name, schema: SellerSchema }
          ])
        ],
        providers: [
          ShopAuthService,
          {
            provide: JwtService,
            useValue: mockJwtService,
          },
        ],
      }).compile();

      shopAuthService = moduleRef.get<ShopAuthService>(ShopAuthService);
      shopModel = moduleRef.get<Model<Shop>>(getModelToken(Shop.name));
      sellerModel = moduleRef.get<Model<Seller>>(getModelToken(Seller.name));
      jwtService = moduleRef.get<JwtService>(JwtService);
    });

    afterAll(async () => {
      await moduleRef.close();
    });

    beforeEach(async () => {
      // Очищаем коллекции перед каждым тестом
      await shopModel.deleteMany({});
      await sellerModel.deleteMany({});
      jest.clearAllMocks();
      
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

    describe('Регистрация магазина', () => {
      const registerDto: RegisterShopDto = {
        login: 'test-shop',
        shopName: 'Тестовый магазин',
        password: 'password123'
      };

      it('успешно регистрирует магазин', async () => {
        // Вызываем метод регистрации
        const result = await shopAuthService.register(registerDto, authedSeller);
        
        // Проверяем, что JWT был подписан
        expect(jwtService.sign).toHaveBeenCalled();
        
        // Проверяем формат ответа
        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('shop');
        expect(result.token).toBe('test-token');
        expect(result.shop).toHaveProperty('shopId');
        expect(result.shop).toHaveProperty('login', registerDto.login);
        expect(result.shop).toHaveProperty('shopName', registerDto.shopName);
        
        // Проверяем, что магазин действительно был сохранен в базу данных
        const savedShop = await shopModel.findOne({ login: registerDto.login });
        expect(savedShop).toBeTruthy();
        
        // Добавляем явную проверку для TypeScript
        if (!savedShop) {
          fail('Магазин не был сохранен в базу данных');
          return;
        }
        
        expect(savedShop.login).toBe(registerDto.login);
        expect(savedShop.shopName).toBe(registerDto.shopName);
        expect(savedShop.owner.toString()).toBe(authedSeller.id);
      });

      it('хеширует пароль перед сохранением', async () => {
        // Регистрируем магазин
        await shopAuthService.register(registerDto, authedSeller);
        
        const savedShop = await shopModel.findOne({ login: registerDto.login });
        
        // Добавляем явную проверку для TypeScript
        if (!savedShop) {
          fail('Магазин не был сохранен в базу данных');
          return;
        }
        
        expect(savedShop.password).not.toBe(registerDto.password);
        expect(savedShop.password).toMatch(/^\$2[aby]\$\d+\$/); // Проверяем формат bcrypt хеша
      });

      it('должен выбросить BadRequestException при попытке регистрации с существующим логином', async () => {
        // Сначала регистрируем магазин
        await shopAuthService.register(registerDto, authedSeller);

        // Пытаемся зарегистрировать еще один магазин с тем же логином
        await expect(shopAuthService.register(registerDto, authedSeller)).rejects.toThrow(BadRequestException);
        await expect(shopAuthService.register(registerDto, authedSeller)).rejects.toThrow(`Магазин с логином "${registerDto.login}" уже зарегистрирован в вашем аккаунте`);
      });

      it('должен выбросить NotFoundException если продавец не найден', async () => {
        // Создаем несуществующего продавца
        const nonExistingSeller: AuthenticatedUser = {
          id: '507f1f77bcf86cd799439011', // Валидный но несуществующий ObjectId
          type: UserType.SELLER
        };

        // Попытка зарегистрировать магазин с несуществующим продавцом
        await expect(shopAuthService.register(registerDto, nonExistingSeller)).rejects.toThrow(NotFoundException);
        // Примечание: в некоторых случаях второй вызов может быть излишним, особенно если первый успешно проверяет тип исключения
      });
    });
    
    describe('Полный цикл регистрации и авторизации магазина', () => {
      it('должен позволить зарегистрировать магазин и затем войти с его учетными данными', async () => {
        // Данные для регистрации
        const registerDto: RegisterShopDto = {
          login: 'test-shop',
          shopName: 'Тестовый магазин',
          password: 'password123'
        };

        // Данные для входа
        const loginDto: LoginShopDto = {
          login: 'test-shop',
          password: 'password123'
        };

        // Шаг 1: Регистрация
        await shopAuthService.register(registerDto, authedSeller);
        
        // Проверяем, что магазин создан
        const shopAfterRegister = await shopModel.findOne({ login: registerDto.login });
        expect(shopAfterRegister).toBeTruthy();
        
        // Шаг 2: Авторизация
        const result = await shopAuthService.login(loginDto);
        
        // Проверяем успешную авторизацию
        expect(result.token).toBe('test-token');
        expect(result.shop).toHaveProperty('login', loginDto.login);
      });
    });
  });
});
