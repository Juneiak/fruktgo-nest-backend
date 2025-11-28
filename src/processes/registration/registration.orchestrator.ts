import { Injectable, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { CustomerPort, CUSTOMER_PORT, CustomerCommands } from 'src/modules/customer';
import { SellerPort, SELLER_PORT, SellerCommands } from 'src/modules/seller';
import { EmployeePort, EMPLOYEE_PORT, EmployeeCommands } from 'src/modules/employee';
import { 
  SELLER_ACCOUNT_PORT, 
  SellerAccountPort, 
  SellerAccountCommands 
} from 'src/modules/finance/seller-account';
import { DomainError } from 'src/common/errors';
import { parcePhoneNumber } from 'src/common/utils';

import {
  RegisterCustomerInput,
  RegisterCustomerOutput,
  RegisterSellerInput,
  RegisterSellerOutput,
  CreateEmployeeInviteInput,
  CreateEmployeeInviteOutput,
  AcceptEmployeeInviteInput,
  AcceptEmployeeInviteOutput,
} from './registration.types';

export const REGISTRATION_ORCHESTRATOR = Symbol('REGISTRATION_ORCHESTRATOR');

const INVITE_EXPIRES_DAYS = 7;

@Injectable()
export class RegistrationOrchestrator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(CUSTOMER_PORT) private readonly customerPort: CustomerPort,
    @Inject(SELLER_PORT) private readonly sellerPort: SellerPort,
    @Inject(EMPLOYEE_PORT) private readonly employeePort: EmployeePort,
    @Inject(SELLER_ACCOUNT_PORT) private readonly sellerAccountPort: SellerAccountPort,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // ====================================================
  // REGISTER CUSTOMER
  // ====================================================
  async registerCustomer(input: RegisterCustomerInput): Promise<RegisterCustomerOutput> {
    const phone = parcePhoneNumber(input.phone);
    if (!phone) throw DomainError.validation('Некорректный номер телефона');

    // Проверка существования
    const existingCustomer = await this.customerPort.getCustomer(
      { filter: { telegramId: input.telegramId } }
    );
    if (existingCustomer) {
      throw DomainError.conflict('Клиент уже зарегистрирован');
    }

    const existingByPhone = await this.customerPort.getCustomer(
      { filter: { phone: phone.number } }
    );
    if (existingByPhone) {
      throw DomainError.conflict('Клиент с таким телефоном уже существует');
    }

    // Создание клиента
    const customer = await this.customerPort.createCustomer(
      new CustomerCommands.CreateCustomerCommand({
        telegramId: input.telegramId,
        customerName: input.customerName,
        phone: phone.number,
        telegramUsername: input.telegramUsername,
        telegramFirstName: input.telegramFirstName,
        telegramLastName: input.telegramLastName,
        email: input.email,
      })
    );

    // Событие
    this.eventEmitter.emit('customer.registered', { customerId: customer._id.toString() });

    return { customer };
  }

  // ====================================================
  // REGISTER SELLER
  // ====================================================
  /**
   * Регистрация продавца:
   * 1. Проверка уникальности (telegram, phone, inn, email)
   * 2. Создание SellerAccount (финансовый счёт)
   * 3. Создание Seller с привязкой к SellerAccount
   * Всё в транзакции для атомарности.
   */
  async registerSeller(input: RegisterSellerInput): Promise<RegisterSellerOutput> {
    const phone = parcePhoneNumber(input.phone);
    if (!phone) throw DomainError.validation('Некорректный номер телефона');

    // Проверка существования (вне транзакции для быстрого fail)
    const existingByTelegram = await this.sellerPort.getSeller(
      { filter: { telegramId: input.telegramId } }
    );
    if (existingByTelegram) {
      throw DomainError.conflict('Продавец уже зарегистрирован');
    }

    const existingByPhone = await this.sellerPort.getSeller(
      { filter: { phone: phone.number } }
    );
    if (existingByPhone) {
      throw DomainError.conflict('Продавец с таким телефоном уже существует');
    }

    const existingByInn = await this.sellerPort.getSeller(
      { filter: { inn: input.inn } }
    );
    if (existingByInn) {
      throw DomainError.conflict('Продавец с таким ИНН уже существует');
    }

    // Создание в транзакции
    const session = await this.connection.startSession();
    let seller;
    
    try {
      await session.withTransaction(async () => {
        // 1. Создаём SellerAccount (финансовый счёт продавца)
        // Генерируем ID заранее для связи Seller ↔ SellerAccount
        const sellerId = new Types.ObjectId();
        
        const sellerAccount = await this.sellerAccountPort.createSellerAccount(
          new SellerAccountCommands.CreateSellerAccountCommand(sellerId.toString()),
          { session }
        );
        
        // 2. Создаём Seller с привязкой к SellerAccount
        seller = await this.sellerPort.createSeller(
          new SellerCommands.CreateSellerCommand({
            sellerAccountId: sellerAccount._id.toString(),
            telegramId: input.telegramId,
            phone: phone.number,
            companyName: input.companyName,
            inn: input.inn,
            email: input.email,
            telegramUsername: input.telegramUsername,
            telegramFirstName: input.telegramFirstName,
            telegramLastName: input.telegramLastName,
          }, sellerId.toString()),
          { session }
        );
      });

      // Событие
      this.eventEmitter.emit('seller.registered', { 
        sellerId: seller._id.toString(),
        sellerAccountId: seller.account.toString(),
      });

      return { seller };
    } finally {
      await session.endSession();
    }
  }

  // ====================================================
  // CREATE EMPLOYEE INVITE
  // ====================================================
  async createEmployeeInvite(input: CreateEmployeeInviteInput): Promise<CreateEmployeeInviteOutput> {
    // Создание сотрудника в статусе PENDING
    const employee = await this.employeePort.createEmployee(
      new EmployeeCommands.CreateEmployeeCommand({
        employerId: input.employerId,
        employeeName: input.employeeName,
        phone: input.phone,
        pinnedTo: input.pinnedTo,
        position: input.position,
        salary: input.salary,
        sellerNote: input.sellerNote,
      })
    );

    // Генерация токена приглашения
    const inviteToken = this.jwtService.sign(
      { employeeId: employee._id.toString(), type: 'employee_invite' },
      { expiresIn: `${INVITE_EXPIRES_DAYS}d` }
    );

    const botName = this.configService.get<string>('SELLER_BOT_NAME') || 'fruktgo_seller_bot';
    const inviteUrl = `https://t.me/${botName}?start=invite_${inviteToken}`;

    // Событие
    this.eventEmitter.emit('employee.invited', {
      employeeId: employee._id.toString(),
      employerId: input.employerId,
    });

    return { employee, inviteToken, inviteUrl };
  }

  // ====================================================
  // ACCEPT EMPLOYEE INVITE
  // ====================================================
  async acceptEmployeeInvite(input: AcceptEmployeeInviteInput): Promise<AcceptEmployeeInviteOutput> {
    // Декодируем токен
    let payload: { employeeId: string; type: string };
    try {
      payload = this.jwtService.verify(input.inviteToken);
    } catch {
      throw DomainError.validation('Недействительный или истёкший токен приглашения');
    }

    if (payload.type !== 'employee_invite') {
      throw DomainError.validation('Неверный тип токена');
    }

    // Активируем сотрудника
    const employee = await this.employeePort.activateEmployee(
      new EmployeeCommands.ActivateEmployeeCommand(payload.employeeId, {
        telegramId: input.telegramId,
        telegramUsername: input.telegramUsername,
        telegramFirstName: input.telegramFirstName,
        telegramLastName: input.telegramLastName,
      })
    );

    // Событие
    this.eventEmitter.emit('employee.activated', {
      employeeId: employee._id.toString(),
    });

    return { employee };
  }
}
