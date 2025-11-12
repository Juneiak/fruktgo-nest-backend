import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { randomUUID } from 'crypto';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import {
  CreateCustomerCommand,
  BlockCustomerCommand,
  UpdateCustomerCommand,
  AddAddressCommand,
  DeleteAddressCommand,
  SelectAddressCommand
} from './customer.commands';
import { DomainError } from 'src/common/errors';
import { Customer, CustomerModel } from './customer.schema';
import { assignField, checkId } from 'src/common/utils';
import { GetCustomersQuery, GetCustomerQuery } from './customer.queries';
import { AddressesPort, ADDRESSES_PORT, AddressesCommands, AddressesQueries, AddressesEnums } from 'src/infra/addresses';

@Injectable()
export class CustomerService {
  constructor(
    @InjectModel(Customer.name) private customerModel: CustomerModel,
    @Inject(ADDRESSES_PORT) private addressesPort: AddressesPort,
  ) { }


  // ====================================================
  // QUERIES
  // ==================================================== 
  async getCustomers(
    query: GetCustomersQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Customer>> {
    
    const { filters } = query;
    const dbQueryFilter: any = {};

    if (filters?.verifiedStatuses && filters.verifiedStatuses.length > 0) dbQueryFilter.verifiedStatus = { $in: filters.verifiedStatuses };
    if (filters?.blockedStatuses && filters.blockedStatuses.length > 0) dbQueryFilter.blocked.status = { $in: filters.blockedStatuses };
    if (filters?.sexes && filters.sexes.length > 0) dbQueryFilter.sex = { $in: filters.sexes };
    if (filters?.fromBirthDate || filters?.toBirthDate) {
      dbQueryFilter.birthDate = {};
      if (filters.fromBirthDate) dbQueryFilter.birthDate.$gte = filters.fromBirthDate.getTime();
      if (filters.toBirthDate) dbQueryFilter.birthDate.$lte = filters.toBirthDate.getTime();
    }

    const dbQueryOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 10,
      lean: true, leanWithId: true,
      sort: queryOptions?.sort || { createdAt: -1 }
    };
    
    const result = await this.customerModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  async getCustomer(
    query: GetCustomerQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Customer | null> {

    const { filter } = query;

    let dbQueryFilter: any;
    if (filter?.customerId) dbQueryFilter = { _id: new Types.ObjectId(filter.customerId) };
    else if (filter?.telegramId) dbQueryFilter = { telegramId: filter.telegramId };
    else if (filter?.phone) dbQueryFilter = { phone: filter.phone };
    else if (filter?.email) dbQueryFilter = { email: filter.email };
    else throw DomainError.badRequest('Неверные параметры запроса');
    
    const dbQuery = this.customerModel.findOne(dbQueryFilter);
    if (queryOptions?.session) dbQuery.session(queryOptions.session);
    
    const customer = await dbQuery.lean({ virtuals: true }).exec();
    return customer;
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createCustomer(
    command: CreateCustomerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Customer> {
    const { payload } = command;

    // Проверяем уникальность telegramId
    const existing = await this.customerModel.findOne({ telegramId: payload.telegramId }).exec();
    if (existing) throw DomainError.conflict('Клиент с таким Telegram ID уже существует');

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
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const customer = await this.customerModel.create([customerData], createOptions).then(docs => docs[0]);
    
    return customer;
  }


  async updateCustomer(
    command: UpdateCustomerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { customerId, payload } = command;
    checkId([customerId]);

    const dbQuery = this.customerModel.findOne({ _id: new Types.ObjectId(customerId)});
    if (commandOptions?.session) dbQuery.session(commandOptions?.session);
    
    const customer = await dbQuery.exec();
    if (!customer) throw DomainError.notFound('Customer', customerId);

    assignField(customer, 'verifiedStatus', payload.verifiedStatus );
    assignField(customer, 'internalNote', payload.internalNote );
    assignField(customer, 'customerName', payload.customerName );
    assignField(customer, 'sex', payload.sex );
    assignField(customer, 'birthDate', payload.birthDate );
    assignField(customer, 'email', payload.email );

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions?.session;
    
    await customer.save(saveOptions);
  }


  async blockCustomer(
    command: BlockCustomerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { customerId, payload } = command;
    checkId([customerId]);

    const dbQuery = this.customerModel.findOne({ _id: new Types.ObjectId(customerId) });
    if (commandOptions?.session) dbQuery.session(commandOptions.session);
    
    const customer = await dbQuery.exec();
    if (!customer) throw DomainError.notFound('Customer', customerId);

    assignField(customer.blocked, 'status', payload.status );
    assignField(customer.blocked, 'reason', payload.reason );
    assignField(customer.blocked, 'code', payload.code );
    assignField(customer.blocked, 'blockedUntil', payload.blockedUntil );

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions?.session;
    
    await customer.save(saveOptions);
  }


  async addAddress(
    command: AddAddressCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { customerId, payload } = command;
    checkId([customerId]);

    // Проверяем существование клиента
    const customer = await this.customerModel.findById(new Types.ObjectId(customerId))
      .session(commandOptions?.session || null)
      .exec();
    
    if (!customer) throw DomainError.notFound('Customer', customerId);

    // Создаем адрес через AddressesPort
    const createCommand = new AddressesCommands.CreateAddressCommand(
      AddressesEnums.AddressEntityType.CUSTOMER,
      customerId,
      {
        latitude: payload.latitude,
        longitude: payload.longitude,
        city: payload.city,
        street: payload.street,
        house: payload.house,
        apartment: payload.apartment || undefined,
        floor: payload.floor || undefined,
        entrance: payload.entrance || undefined,
        intercomCode: payload.intercomCode || undefined,
      }
    );

    const newAddress = await this.addressesPort.createAddress(createCommand, commandOptions);
    const addressObjectId = new Types.ObjectId(newAddress.addressId);

    // Добавляем ObjectId адреса в массив addresses
    customer.addresses.push(addressObjectId);

    // Если это первый адрес, устанавливаем его как выбранный
    if (customer.addresses.length === 1) {
      customer.selectedAddress = addressObjectId;
    }

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    await customer.save(saveOptions);
  }


  async deleteAddress(
    command: DeleteAddressCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { customerId, payload } = command;
    checkId([customerId, payload.addressId]);

    const customer = await this.customerModel.findById(new Types.ObjectId(customerId))
      .session(commandOptions?.session || null)
      .exec();
    
    if (!customer) throw DomainError.notFound('Customer', customerId);

    const addressObjectId = new Types.ObjectId(payload.addressId);
    const wasSelected = customer.selectedAddress?.toString() === payload.addressId;

    // Удаляем ObjectId из массива addresses
    customer.addresses = customer.addresses.filter(
      addr => addr.toString() !== payload.addressId
    );

    // Удаляем адрес через AddressesPort
    await this.addressesPort.deleteAddress(payload.addressId, commandOptions);

    // Если удалён выбранный адрес, выбираем первый из оставшихся или null
    if (wasSelected) {
      customer.selectedAddress = customer.addresses.length > 0 ? customer.addresses[0] : null;
    }
        
    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    await customer.save(saveOptions);
  }


  async selectAddress(
    command: SelectAddressCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { customerId, payload } = command;
    checkId([customerId, payload.addressId]);

    const customer = await this.customerModel.findById(new Types.ObjectId(customerId))
      .session(commandOptions?.session || null)
      .exec();
    
    
    if (!customer) throw DomainError.notFound('Customer', customerId);

    const addressObjectId = new Types.ObjectId(payload.addressId);

    // Проверяем, что адрес есть в массиве addresses клиента
    const addressExists = customer.addresses.some(addr => addr.toString() === payload.addressId);
    if (!addressExists) {
      throw DomainError.notFound('Address', payload.addressId);
    }

    // Устанавливаем выбранный адрес
    customer.selectedAddress = addressObjectId;

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    await customer.save(saveOptions);
  }
}
