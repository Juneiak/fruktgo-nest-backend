import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CustomerModel } from '../schemas/customer.schema';
import { Customer } from '../schemas/customer.schema';


@Injectable()
export class CustomerSharedService {
  constructor(
    @InjectModel('Customer') private customerModel: CustomerModel,
  ) {}

  async getCustomerByTelegramId(telegramId: number): Promise<Customer | null> {
    const customer = await this.customerModel.findOne({ telegramId }).select('_id isBlocked verifiedStatus customerName phone bonusPoints telegramUsername telegramId customerId').lean({virtuals: true}).exec();
    if (!customer) return null;
    return customer;
  }
}