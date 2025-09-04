import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CustomerModel } from '../schemas/customer.schema';
import { plainToInstance } from 'class-transformer';
import {
  CreateAddressDto,
  UpdateCustomerDto,
} from './customer.request.dto';
import { CustomerResponseDto } from './customer.response.dto';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { Types } from 'mongoose';
import { Address } from 'src/common/schemas/common-schemas';


@Injectable()
export class CustomerService {
  constructor(
    @InjectModel('Customer') private customerModel: CustomerModel,
  ) {}

  // ====================================================
  // ADDRESSES 
  // ====================================================
  async addAddress(authedCustomer: AuthenticatedUser, dto: CreateAddressDto): Promise<CustomerResponseDto> {
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    const newAddressId = new Types.ObjectId();
    const newAddress = {
      _id: newAddressId,
      city: dto.city,
      street: dto.street,
      house: dto.house || null,
      apartment: dto.apartment || null,
      entrance: dto.entrance || null,
      floor: dto.floor || null,
      intercomCode: dto.intercomCode || null,
      latitude: dto.latitude || null,
      longitude: dto.longitude || null,
    } as Address;

    customer.savedAddresses.push(newAddress);

    // Если раньше не было выбранного адреса, выбираем только что добавленный (первый)
    if (!customer.selectedAddressId && customer.savedAddresses.length === 1) customer.selectedAddressId = newAddressId as any;

    await customer.save();
    return this.getCustomer(authedCustomer);
  }


  async deleteSavedAddress(authedCustomer: AuthenticatedUser, addressId: string): Promise<CustomerResponseDto> {
    checkId([addressId]);
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    const wasSelected = customer.selectedAddressId && customer.selectedAddressId.toString() === addressId;

    // Удаляем адрес из массива сохранённых адресов
    customer.savedAddresses = customer.savedAddresses.filter(addr => addr._id.toString() !== addressId);

    // Если удалён выбранный адрес — переопределяем selectedAddressId на первый оставшийся либо null
    if (wasSelected) customer.selectedAddressId = customer.savedAddresses.length > 0 ? (customer.savedAddresses[0]._id as any) : null;
    await customer.save();

    return this.getCustomer(authedCustomer);
  }


  async selectAddress(authedCustomer: AuthenticatedUser, addressId: string): Promise<CustomerResponseDto> {
    checkId([addressId]);
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    // Найдём адрес по ID в списке сохранённых адресов
    const exists = customer.savedAddresses.some(addr => addr._id.toString() === addressId);
    if (!exists) throw new NotFoundException('Адрес не найден');

    // Установим selectedAddressId (флагов на адресах нет)
    customer.selectedAddressId = new Types.ObjectId(addressId) as any;

    await customer.save();

    return this.getCustomer(authedCustomer);
  }



  // ====================================================
  // CUSTOMER
  // ====================================================
  async getCustomer(authedCustomer: AuthenticatedUser): Promise<CustomerResponseDto> {
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id))
      .select('telegramId customerName phone sex birthDate email bonusPoints savedAddresses selectedAddress cart activeOrders')
      .populate('cart')
      .populate('activeOrders')
      .lean({virtuals: true}).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    return plainToInstance(CustomerResponseDto, customer, { excludeExtraneousValues: true, enableCircularCheck: true });
  }


  async updateCustomer(authedCustomer: AuthenticatedUser, dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    
    if (dto.customerName !== undefined) customer.customerName = dto.customerName;
    if (dto.sex !== undefined) customer.sex = dto.sex;
    if (dto.birthDate !== undefined) customer.birthDate = dto.birthDate;
    if (dto.email !== undefined) customer.email = dto.email;
    
    await customer.save();

    return this.getCustomer(authedCustomer);
  }

}