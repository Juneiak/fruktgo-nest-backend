import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { EmployeesForSellerService } from "src/modules/employees/for-seller/employees-for-seller.service";
import { UpdateEmployeeDto } from "src/modules/employees/for-seller/employees-for-seller.dtos";
import { AuthenticatedUser, EmployeeStatus, UserSex, VerifiedStatus, UserType } from "src/common/types";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Types, Model } from "mongoose";
import { rootMongooseTestModule, closeMongoConnection } from '../../helpers/database.module';
import { Employee, EmployeeSchema } from "src/modules/employees/employee.schema";
import { Seller, SellerSchema } from "src/modules/seller/seller.schema";
import { Shop, ShopSchema } from "src/modules/shops/schemas/shop.schema";
import { MongooseModule } from "@nestjs/mongoose";
import { MessageResponseDto } from "src/common/dtos";

describe('EmployeesForSellerService - Интеграционный тест CRUD операций для сотрудников', () => {
  let service: EmployeesForSellerService;
  let employeeModel: Model<Employee>;
  let sellerModel: Model<Seller>;
  let shopModel: Model<Shop>;
  let moduleRef: TestingModule;

  // Общие тестовые данные для всех тестов
  const sellerId = new Types.ObjectId();
  const employeeId = new Types.ObjectId();
  const shopId = new Types.ObjectId();
  const otherSellerId = new Types.ObjectId();

  const mockAuthUser: AuthenticatedUser = {
    id: sellerId.toString(),
    type: UserType.SELLER,
  };

  // Мок данных продавца
  const mockSeller = {
    _id: sellerId,
    isBlocked: false,
    verifiedStatus: VerifiedStatus.VERIFIED,
    employees: [],
    email: 'seller@test.com',
    phone: '+79001234567',
    inn: 1234567890,
    companyName: 'ООО "Фрукты и овощи"',
    password: 'hashedPassword123',
    totalSales: 0,
    totalOrders: 0,
    shopsCount: 0,
    employeesCount: 0,
    productsCount: 0
  };

  // Мок данных сотрудника
  const mockEmployee = {
    _id: employeeId,
    employer: sellerId,
    employeeName: 'Иван Иванов',
    phone: '+79001112233',
    sex: UserSex.MALE,
    status: EmployeeStatus.WORKING,
    birthDate: new Date('1990-01-01'),
    position: 'Менеджер',
    salary: '50000',
    sellerNote: 'Отличный работник',
    pinnedTo: null,
    totalOrders: 10,
    totalShifts: 5,
    shiftRating: 4.8,
    password: 'employeeHashedPassword123',
    isBlocked: false,
    verifiedStatus: VerifiedStatus.VERIFIED
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: 'Employee', schema: EmployeeSchema },
          { name: 'Seller', schema: SellerSchema },
          { name: 'Shop', schema: ShopSchema },
        ]),
      ],
      providers: [EmployeesForSellerService],
    }).compile();

    service = moduleRef.get<EmployeesForSellerService>(EmployeesForSellerService);
    employeeModel = moduleRef.get<Model<Employee>>(getModelToken('Employee'));
    sellerModel = moduleRef.get<Model<Seller>>(getModelToken('Seller'));
    shopModel = moduleRef.get<Model<Shop>>(getModelToken('Shop'));
  });

  afterAll(async () => {
    await moduleRef.close();
    await closeMongoConnection();
  });

  beforeEach(async () => {
    // Очищаем коллекции перед каждым тестом
    await employeeModel.deleteMany({}).exec();
    await sellerModel.deleteMany({}).exec();
    await shopModel.deleteMany({}).exec();

    // Создаем тестовые данные продавца
    await sellerModel.create(mockSeller);
    
    // Создаем тестовые данные сотрудника
    await employeeModel.create(mockEmployee);

    // Создаем тестовый магазин
    await shopModel.create({
      _id: shopId,
      owner: sellerId,
      shopName: 'Тестовый магазин',
      password: 'password123',
      address: 'Тестовый адрес',
      login: 'test-login',
    });

    // Для тестов с другим продавцом
    await sellerModel.create({
      _id: otherSellerId,
      isBlocked: false,
      verifiedStatus: VerifiedStatus.VERIFIED,
      employees: [],
      email: 'test2@example.com',
      phone: '+79001234567',
      inn: '1234567890',
      companyName: 'Другая тестовая компания',
      password: 'password123',
    });

    // Для теста с магазином другого продавца
    await shopModel.create({
      _id: new Types.ObjectId(),
      owner: otherSellerId,
      shopName: 'Магазин другого продавца',
      login: 'other-seller-shop',
      password: 'password123'
    });
  });

  // Тесты для удаления сотрудника
  describe('Удаление сотрудника (removeSellerEmployee)', () => {
    it('должен успешно удалить сотрудника', async () => {
      // Act
      const result: MessageResponseDto = await service.removeSellerEmployee(
        mockAuthUser,
        employeeId.toString()
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.message).toBe('Сотрудник успешно удален');

      // Проверка, что сотрудник действительно удален из базы
      const deletedEmployee = await employeeModel.findById(employeeId).exec();
      expect(deletedEmployee).toBeNull();
    });

    it('должен выбросить NotFoundException если продавец не найден', async () => {
      // Arrange
      const nonExistentSellerId = new Types.ObjectId();
      const invalidAuthUser: AuthenticatedUser = {
        id: nonExistentSellerId.toString(),
        type: UserType.SELLER,
      };

      // Act & Assert
      await expect(
        service.removeSellerEmployee(invalidAuthUser, employeeId.toString())
      ).rejects.toThrow(NotFoundException);

      // Дополнительно проверяем, что сотрудник не был удален из базы
      const employee = await employeeModel.findById(employeeId).exec();
      expect(employee).not.toBeNull();
    });

    it('должен выбросить NotFoundException если сотрудник не найден', async () => {
      // Arrange
      const nonExistentEmployeeId = new Types.ObjectId();

      // Act & Assert
      await expect(
        service.removeSellerEmployee(mockAuthUser, nonExistentEmployeeId.toString())
      ).rejects.toThrow(NotFoundException);
    });

    it('должен выбросить ForbiddenException если сотрудник принадлежит другому продавцу', async () => {
      // Arrange
      // Создаем сотрудника, принадлежащего другому продавцу
      const otherSellerEmployeeId = new Types.ObjectId();
      await employeeModel.create({
        _id: otherSellerEmployeeId,
        employer: otherSellerId,
        employeeName: 'Петр Петров',
        phone: '+79009998877',
        status: EmployeeStatus.WORKING,
        password: 'otherEmployeeHashedPassword456',
        isBlocked: false,
        verifiedStatus: VerifiedStatus.VERIFIED
      });

      // Act & Assert
      await expect(
        service.removeSellerEmployee(mockAuthUser, otherSellerEmployeeId.toString())
      ).rejects.toThrow(ForbiddenException);

      // Проверка, что сотрудник не был удален из базы
      const employee = await employeeModel.findById(otherSellerEmployeeId).exec();
      expect(employee).not.toBeNull();
    });
  });

  // Тесты для обновления сотрудника
  describe('Обновление сотрудника (updateSellerEmployee)', () => {
    it('должен успешно обновить сотрудника', async () => {
      // Arrange
      const updateDto: UpdateEmployeeDto = {
        sex: UserSex.FEMALE,
        birthDate: new Date('1991-02-02'),
        position: 'Старший менеджер',
        salary: '60000',
        pinnedTo: shopId.toString(),
        sellerNote: 'Повышение',
      };

      // Act
      const result = await service.updateSellerEmployee(
        mockAuthUser,
        employeeId.toString(),
        updateDto,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.sex).toBe(updateDto.sex);
      expect(result.position).toBe(updateDto.position);
      expect(result.salary).toBe(updateDto.salary);
      expect(result.sellerNote).toBe(updateDto.sellerNote);
      
      // Проверяем, что поле pinnedTo установлено
      expect(result.pinnedTo).toBeDefined();
      expect(typeof result.pinnedTo.toString()).toBe('string');
      expect(result.pinnedTo.toString().length).toBeGreaterThan(0);

      // Проверка, что данные действительно обновились в БД
      const updatedEmployee = await employeeModel.findById(employeeId);
      expect(updatedEmployee).toBeDefined();
      expect(updatedEmployee?.sex).toBe(updateDto.sex);
      expect(updatedEmployee?.position).toBe(updateDto.position);
      expect(updatedEmployee?.salary).toBe(updateDto.salary);
      expect(updatedEmployee?.sellerNote).toBe(updateDto.sellerNote);
      expect(updatedEmployee?.pinnedTo).toBeDefined();
      expect(updatedEmployee?.pinnedTo?.toString().length).toBeGreaterThan(0);
    });

    it('должен выбросить ForbiddenException если продавец не найден', async () => {
      // Arrange
      const updateDto: UpdateEmployeeDto = {
        sex: UserSex.FEMALE,
        birthDate: new Date('1991-02-02'),
        position: 'Старший менеджер',
        salary: '60000',
        pinnedTo: shopId.toString(),
        sellerNote: 'Повышение',
      };

      const nonExistentSellerId = new Types.ObjectId();
      const mockNonExistentSellerAuth: AuthenticatedUser = {
        id: nonExistentSellerId.toString(),
        type: UserType.SELLER,
      };

      // Act & Assert
      await expect(service.updateSellerEmployee(
        mockNonExistentSellerAuth, 
        employeeId.toString(), 
        updateDto
      )).rejects.toThrow(ForbiddenException);
    });

    it('должен выбросить NotFoundException если сотрудник не найден', async () => {
      // Arrange
      const updateDto: UpdateEmployeeDto = {
        sex: UserSex.FEMALE,
        birthDate: new Date('1991-02-02'),
        position: 'Старший менеджер',
        salary: '60000',
        pinnedTo: shopId.toString(),
        sellerNote: 'Повышение',
      };

      const nonExistentEmployeeId = new Types.ObjectId();

      // Act & Assert
      await expect(service.updateSellerEmployee(
        mockAuthUser,
        nonExistentEmployeeId.toString(),
        updateDto
      )).rejects.toThrow(NotFoundException);
    });

    it('должен выбросить ForbiddenException если сотрудник принадлежит другому продавцу', async () => {
      // Arrange
      const updateDto: UpdateEmployeeDto = {
        sex: UserSex.FEMALE,
        birthDate: new Date('1991-02-02'),
        position: 'Старший менеджер',
        salary: '60000',
        pinnedTo: shopId.toString(),
        sellerNote: 'Повышение',
      };

      // Создаем сотрудника другого продавца
      const otherSellerEmployeeId = new Types.ObjectId();
      await employeeModel.create({
        _id: otherSellerEmployeeId,
        employer: otherSellerId,
        employeeName: 'Сотрудник другого продавца',
        phone: '+79001112244',
        password: 'password123',
      });

      // Act & Assert
      await expect(service.updateSellerEmployee(
        mockAuthUser,
        otherSellerEmployeeId.toString(),
        updateDto
      )).rejects.toThrow(ForbiddenException);
    });

    it('должен выбросить NotFoundException если магазин не найден', async () => {
      // Arrange
      const nonExistentShopId = new Types.ObjectId();
      const updateDto: UpdateEmployeeDto = {
        sex: UserSex.FEMALE,
        birthDate: new Date('1991-02-02'),
        position: 'Старший менеджер',
        salary: '60000',
        pinnedTo: nonExistentShopId.toString(),
        sellerNote: 'Повышение',
      };

      // Act & Assert
      await expect(service.updateSellerEmployee(
        mockAuthUser,
        employeeId.toString(),
        updateDto
      )).rejects.toThrow(NotFoundException);
    });

    it('должен выбросить ForbiddenException если магазин принадлежит другому продавцу', async () => {
      // Arrange
      const otherSellerShopId = new Types.ObjectId();
      
      // Создаем магазин другого продавца
      await shopModel.create({
        _id: otherSellerShopId,
        owner: otherSellerId,
        shopName: 'Еще один магазин другого продавца',
        login: 'other-shop-login',
        password: 'password123'
      });

      const updateDto: UpdateEmployeeDto = {
        sex: UserSex.FEMALE,
        birthDate: new Date('1991-02-02'),
        position: 'Старший менеджер',
        salary: '60000',
        pinnedTo: otherSellerShopId.toString(),
        sellerNote: 'Повышение',
      };

      // Act & Assert
      await expect(service.updateSellerEmployee(
        mockAuthUser,
        employeeId.toString(),
        updateDto
      )).rejects.toThrow(ForbiddenException);
    });
  });
});
