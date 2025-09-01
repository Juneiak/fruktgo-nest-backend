import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CustomerModel } from '../schemas/customer.schema';
import { plainToInstance } from 'class-transformer';
import { CustomerPreviewResponseDto } from './customer.shared.response.dto';


@Injectable()
export class CustomerSharedService {
  constructor(
    @InjectModel('Customer') private customerModel: CustomerModel,
  ) {}

  async getCustomerByTelegramId(telegramId: number): Promise<CustomerPreviewResponseDto | null> {
    const customer = await this.customerModel.findOne({ telegramId }).select('_id isBlocked verifiedStatus customerName phone bonusPoints telegramUsername telegramId customerId').lean({virtuals: true}).exec();
    if (!customer) return null;
    return plainToInstance(CustomerPreviewResponseDto, customer, { excludeExtraneousValues: true, enableCircularCheck: true });
  }
}