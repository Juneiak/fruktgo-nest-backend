import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { CommonCommandOptions } from 'src/common/types/comands';
import {
  CreateCustomerCommand,
  BlockCustomerCommand,
  UpdateCustomerCommand,
  AddAddressCommand,
  DeleteAddressCommand,
  SelectAddressCommand
} from './customer.commands';
import { DomainError } from 'src/common/errors/domain-error';
import { Customer, CustomerModel} from './customer.schema';
import { PaginateResult } from 'mongoose';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { assignField, checkId } from 'src/common/utils';
import { Address } from 'src/common/schemas/common-schemas';

@Injectable()
export class CustomerService {
  constructor(
    @InjectModel('Customer') private customerModel: CustomerModel,
  ) { }


  async createCustomer(
    command: CreateCustomerCommand,
    options: CommonCommandOptions
  ): Promise<Customer> {
    const { payload } = command;

    // Проверяем уникальность telegramId
    const existing = await this.customerModel.findOne({ telegramId: payload.telegramId }).exec();
    if (existing) {
      throw new DomainError({ code: 'CONFLICT', message: 'Клиент с таким Telegram ID уже существует' });
    }

    // Создаем только обязательные поля, остальные заполнятся через defaults в схеме
    const customerData = {
      _id: new Types.ObjectId(),
      telegramId: payload.telegramId,
      customerName: payload.customerName,
      telegramUsername: payload.telegramUsername,
      telegramFirstName: payload.telegramFirstName,
      telegramLastName: payload.telegramLastName,
      phone: payload.phone,
      email: payload.email,
    };

    const createOptions: any = {};
    if (options?.session) createOptions.session = options.session;

    const customer = await this.customerModel.create([customerData], createOptions).then(docs => docs[0]);
    
    return customer;
  }


  async getCustomers(
    options: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Customer>> {
    
    const queryOptions: any = {
      page: options.pagination?.page || 1,
      limit: options.pagination?.pageSize || 10,
      lean: true, leanWithId: true,
      sort: options.sort || { createdAt: -1 }
    };
    
    const result = await this.customerModel.paginate({}, queryOptions);
    return result;
  }


  async getCustomer(
    customerId: string,
    options: CommonCommandOptions
  ): Promise<Customer | null> {

    const dbQuery = this.customerModel.findOne({ _id: new Types.ObjectId(customerId)});
    if (options.session) dbQuery.session(options.session);
    const customer = await dbQuery.lean({ virtuals: true }).exec()

    return customer;
  }


  async updateCustomer(
    command: UpdateCustomerCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { customerId, payload } = command;
    checkId([customerId]);

    const dbQuery = this.customerModel.findOne({ _id: new Types.ObjectId(customerId)});
    if (options.session) dbQuery.session(options.session);
    
    const customer = await dbQuery.exec();
    if (!customer) throw new DomainError({ code: 'NOT_FOUND', message: 'Клиент не найден' });

    assignField(customer, 'verifiedStatus', payload.verifiedStatus );
    assignField(customer, 'internalNote', payload.internalNote );
    assignField(customer, 'customerName', payload.customerName );
    assignField(customer, 'sex', payload.sex );
    assignField(customer, 'birthDate', payload.birthDate );
    assignField(customer, 'email', payload.email );

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await customer.save(saveOptions);
  }


  async blockCustomer(
    command: BlockCustomerCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { customerId, payload } = command;
    checkId([customerId]);

    const dbQuery = this.customerModel.findOne({ _id: new Types.ObjectId(customerId) });
    if (options.session) dbQuery.session(options.session);
    
    const customer = await dbQuery.exec();
    if (!customer) throw new DomainError({ code: 'NOT_FOUND', message: 'Клиент не найден' });

    assignField(customer.blocked, 'status', payload.status );
    assignField(customer.blocked, 'reason', payload.reason );
    assignField(customer.blocked, 'code', payload.code );
    assignField(customer.blocked, 'blockedUntil', payload.blockedUntil );

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await customer.save(saveOptions);
  }
  

  async addAddress(
    command: AddAddressCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { customerId, payload } = command;
    checkId([customerId]);

    const dbQuery = this.customerModel.findOne({ _id: new Types.ObjectId(customerId) });
    if (options.session) dbQuery.session(options.session);
    
    const customer = await dbQuery.exec();
    if (!customer) throw new DomainError({ code: 'NOT_FOUND', message: 'Клиент не найден' });

    // Создаем новый адрес
    const newAddress: Address = {
      id: randomUUID(),
      latitude: payload.latitude,
      longitude: payload.longitude,
      city: payload.city,
      street: payload.street,
      house: payload.house,
    };

    // Опциональные поля
    assignField(newAddress, 'apartment', payload.apartment);
    assignField(newAddress, 'floor', payload.floor);
    assignField(newAddress, 'entrance', payload.entrance);
    assignField(newAddress, 'intercomCode', payload.intercomCode);

    customer.savedAddresses.push(newAddress);

    // Если это первый адрес, устанавливаем его как выбранный
    if (customer.savedAddresses.length === 1) customer.selectedAddressId = newAddress.id;

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await customer.save(saveOptions);
  }


  async deleteAddress(
    command: DeleteAddressCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { customerId, addressId } = command;
    checkId([customerId]);

    const dbQuery = this.customerModel.findOne({ _id: new Types.ObjectId(customerId) });
    if (options.session) dbQuery.session(options.session);
    
    const customer = await dbQuery.exec();
    if (!customer) throw new DomainError({ code: 'NOT_FOUND', message: 'Клиент не найден' });

    const wasSelected = customer.selectedAddressId === addressId;
    const addressIndex = customer.savedAddresses.findIndex(addr => addr.id === addressId);
    if (addressIndex === -1) throw new DomainError({ code: 'NOT_FOUND', message: 'Адрес не найден' });

    customer.savedAddresses.splice(addressIndex, 1);

    // Если удалён выбранный адрес — переопределяем selectedAddressId на первый оставшийся либо null
    if (wasSelected) {
      customer.selectedAddressId = customer.savedAddresses.length > 0 ? customer.savedAddresses[0].id : null;
    }

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await customer.save(saveOptions);
  }


  async selectAddress(
    command: SelectAddressCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { customerId, addressId } = command;
    checkId([customerId]);

    const dbQuery = this.customerModel.findOne({ _id: new Types.ObjectId(customerId) });
    if (options.session) dbQuery.session(options.session);
    
    const customer = await dbQuery.exec();
    if (!customer) throw new DomainError({ code: 'NOT_FOUND', message: 'Клиент не найден' });

    // Найдём адрес по ID в списке сохранённых адресов
    const exists = customer.savedAddresses.some(addr => addr.id === addressId);
    if (!exists) throw new DomainError({ code: 'NOT_FOUND', message: 'Адрес не найден' });

    customer.selectedAddressId = addressId;

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await customer.save(saveOptions);
  }
}
