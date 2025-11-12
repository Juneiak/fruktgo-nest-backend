import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';
import {
  CreateAddressDto,
  UpdateCustomerDto,
} from './customer.me.request.dtos';
import { CustomerResponseDto } from './customer.me.response.dtos';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import {
  CustomerPort,
  CUSTOMER_PORT,
  CustomerCommands,
  CustomerQueries
} from 'src/modules/customer';
import {
  LogsCommands,
  LogsEvents,
  LogsEnums
} from 'src/infra/logs';
import { UserType } from 'src/common/enums/common.enum';

@Injectable()
export class CustomerMeRoleService {
  constructor(
    @Inject(CUSTOMER_PORT) private readonly customerPort: CustomerPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ====================================================
  // ADDRESSES 
  // ====================================================
  async addAddress(
    authedCustomer: AuthenticatedUser,
    dto: CreateAddressDto
  ): Promise<CustomerResponseDto> {
    const command = new CustomerCommands.AddAddressCommand(
      authedCustomer.id,
      {
        latitude: dto.latitude,
        longitude: dto.longitude,
        city: dto.city,
        street: dto.street,
        house: dto.house,
        apartment: dto.apartment,
        floor: dto.floor,
        entrance: dto.entrance,
        intercomCode: dto.intercomCode,
      }
    );

    await this.customerPort.addAddress(command);
    return this.getCustomer(authedCustomer);
  }


  async deleteSavedAddress(
    authedCustomer: AuthenticatedUser,
    addressId: string
  ): Promise<CustomerResponseDto> {
    checkId([addressId]);

    const command = new CustomerCommands.DeleteAddressCommand(
      authedCustomer.id,
      { addressId }
    );

    await this.customerPort.deleteAddress(command);
    return this.getCustomer(authedCustomer);
  }


  async selectAddress(
    authedCustomer: AuthenticatedUser,
    addressId: string
  ): Promise<CustomerResponseDto> {
    checkId([addressId]);

    const command = new CustomerCommands.SelectAddressCommand(
      authedCustomer.id,
      { addressId }
    );

    await this.customerPort.selectAddress(command);
    return this.getCustomer(authedCustomer);
  }


  // ====================================================
  // CUSTOMER
  // ====================================================
  async getCustomer(authedCustomer: AuthenticatedUser): Promise<CustomerResponseDto> {

    const query = new CustomerQueries.GetCustomerQuery({ customerId: authedCustomer.id });
    const customer = await this.customerPort.getCustomer(query);
    if (!customer) throw new NotFoundException('Клиент не найден');

    return plainToInstance(CustomerResponseDto, customer, { excludeExtraneousValues: true });
  }


  async updateCustomer(
    authedCustomer: AuthenticatedUser,
    dto: UpdateCustomerDto
  ): Promise<CustomerResponseDto> {

    const command = new CustomerCommands.UpdateCustomerCommand(
      authedCustomer.id,
      {
        customerName: dto.customerName,
        sex: dto.sex,
        birthDate: dto.birthDate,
        email: dto.email,
      }
    );

    await this.customerPort.updateCustomer(command);

    // Логируем обновление профиля
    this.eventEmitter.emit(
      LogsEvents.LOG_EVENTS.CREATED,
      new LogsCommands.CreateLogCommand({
        entityType: LogsEnums.LogEntityType.CUSTOMER,
        entityId: authedCustomer.id,
        text: 'Клиент обновил свои данные',
        logLevel: LogsEnums.LogLevel.LOW,
        forRoles: [UserType.ADMIN, UserType.CUSTOMER],
      })
    );

    return this.getCustomer(authedCustomer);
  }
}