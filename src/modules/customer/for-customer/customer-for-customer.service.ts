import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer } from '../schemas/customer.schema';
import { Cart } from '../schemas/cart.schema';
import { plainToInstance } from 'class-transformer';
import {
  CreateAddressDto,
  CustomerForCustomerResponseDto,
  AddressResponseDto,
  UpdateCustomerDto,
  CustomerPreviewForTelegramBotResponseDto
} from './customer-for-customer.dtos';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { Types } from 'mongoose';


@Injectable()
export class CustomerForCustomerService {
  constructor(
    @InjectModel('Customer') private customerModel: Model<Customer>,
  ) {}

  // ====================================================
  // TELEGRAM HANDLERS 
  // ====================================================

  async getCustomerByTelegramId(telegramId: number): Promise<CustomerPreviewForTelegramBotResponseDto | null> {
    const customer = await this.customerModel.findOne({ telegramId }).select('_id isBlocked verifiedStatus customerName phone bonusPoints telegramUsername telegramId customerId').lean({virtuals: true}).exec();
    if (!customer) return null;
    return plainToInstance(CustomerPreviewForTelegramBotResponseDto, customer, { excludeExtraneousValues: true, enableCircularCheck: true });
  }
  

  // ====================================================
  // ADDRESSES 
  // ====================================================

  async addAddress(authedCustomer: AuthenticatedUser, dto: CreateAddressDto): Promise<AddressResponseDto[]> {
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    customer.savedAddresses.push({
      _id: new Types.ObjectId(),
      city: dto.city,
      street: dto.street,
      house: dto.house || null,
      apartment: dto.apartment || null,
      entrance: dto.entrance || null,
      floor: dto.floor || null,
      intercomCode: dto.intercomCode || null,
      latitude: dto.latitude || null,
      longitude: dto.longitude || null,
      isSelected: customer.savedAddresses.length === 0,
    });
    await customer.save();
    return plainToInstance(AddressResponseDto, customer?.savedAddresses || [], { excludeExtraneousValues: true });
  }


  async deleteSavedAddress(authedCustomer: AuthenticatedUser, addressId: string): Promise<AddressResponseDto[]> {
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    // Проверяем, является ли удаляемый адрес выбранным
    checkId([addressId]);
    
    const isSelectedAddress = customer.savedAddresses.some(addr => 
      addr._id.toString() === addressId && addr.isSelected
    );
    
    // Удаляем адрес из массива сохранённых адресов
    customer.savedAddresses = customer.savedAddresses.filter(addr => addr._id.toString() !== addressId);
    
    // Если удаленный адрес был выбранным и есть другие адреса, выбираем первый из них
    if (isSelectedAddress && customer.savedAddresses.length > 0) {
      customer.savedAddresses[0].isSelected = true;
    }
  
    // Сохраняем изменения
    await customer.save();
  
    return plainToInstance(AddressResponseDto, customer.savedAddresses || [], { excludeExtraneousValues: true });
  }


  async selectAddress(authedCustomer: AuthenticatedUser, addressId: string): Promise<AddressResponseDto[]> {
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    // Найдем адрес по ID в списке сохраненных адресов
    checkId([addressId]);
    const addressIndex = customer.savedAddresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) throw new NotFoundException('Адрес не найден');

    // Сначала сбрасываем флаг isSelected у всех адресов
    customer.savedAddresses.forEach(addr => {
      addr.isSelected = false;
    });
    
    // Устанавливаем флаг isSelected для выбранного адреса
    customer.savedAddresses[addressIndex].isSelected = true;
    await customer.save();
  
    return plainToInstance(AddressResponseDto, customer.savedAddresses, { excludeExtraneousValues: true });
  }



  // ====================================================
  // CUSTOMER
  // ====================================================

  async getCustomer(authedCustomer: AuthenticatedUser): Promise<CustomerForCustomerResponseDto> {
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id))
      .select('telegramId customerName phone sex birthDate email bonusPoints savedAddresses selectedAddress cart activeOrders')
      .populate('cart')
      .populate('activeOrders')
      .lean({virtuals: true}).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    
    return plainToInstance(CustomerForCustomerResponseDto, customer, { excludeExtraneousValues: true, enableCircularCheck: true });
  }


  async updateCustomer(authedCustomer: AuthenticatedUser, dto: UpdateCustomerDto): Promise<CustomerForCustomerResponseDto> {
    const customer = await this.customerModel.findById(new Types.ObjectId(authedCustomer.id)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    
    // Обновляем только предоставленные поля
    if (dto.customerName !== undefined) {
      customer.customerName = dto.customerName;
    }
    
    if (dto.sex !== undefined) {
      customer.sex = dto.sex;
    }
    
    if (dto.birthDate !== undefined) {
      customer.birthDate = dto.birthDate;
    }
    
    if (dto.email !== undefined) {
      customer.email = dto.email;
    };
    
    // Сохраняем изменения
    await customer.save();

    return this.getCustomer(authedCustomer);
  }

}