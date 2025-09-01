import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Admin } from '../admin.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AdminSharedService {
  constructor(
    @InjectModel('Admin') private adminModel: Model<Admin>,
  ) {}

  async getAdminByTelegramId(telegramId: number): Promise<Admin> {
    const admin = await this.adminModel.findOne({ telegramId }).select('+telegramId +telegramUsername').exec();
    if (!admin) throw new UnauthorizedException('Администратор не найден');
    return admin;
  }
}