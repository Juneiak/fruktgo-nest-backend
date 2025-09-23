import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Platform } from '../platform.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AdminSharedService {
  constructor(
    @InjectModel('Platform') private platformModel: Model<Platform>,
  ) {}

  async getAdminByTelegramId(telegramId: number): Promise<Platform> {
    const admin = await this.platformModel.findOne({ telegramId }).select('+telegramId +telegramUsername').exec();
    if (!admin) throw new UnauthorizedException('Платформа не найдена');
    return admin;
  }
}