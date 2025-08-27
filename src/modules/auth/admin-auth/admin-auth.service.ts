import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { LoginCodeForAdminDto, AdminAuthDto } from './admin-auth.dtos';
import { plainToInstance } from 'class-transformer';
import { Admin } from 'src/modules/admin/admin.schema';
import { generateAuthCode } from 'src/common/utils';
import { ConfigService } from '@nestjs/config';
import { ADMIN_AUTH_CODE_EXPIRES_IN, ADMIN_BOT_LOGIN_TO_SYSTEM_PREFIX } from 'src/common/constants';
import { AdminLoginCode } from './admin-login-code.schema';
import { AdminAuthGateway } from './admin-auth.gateway';
import { AuthenticatedUser } from 'src/common/types';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectModel('Admin') private adminModel: Model<Admin>,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel('AdminLoginCode') private adminLoginCodeModel: Model<AdminLoginCode>,
    private readonly adminAuthGateway: AdminAuthGateway,
  ) {}

  async generateLoginCode(): Promise<LoginCodeForAdminDto> {
    const code = generateAuthCode();
    const expiresAt = new Date(Date.now() + ADMIN_AUTH_CODE_EXPIRES_IN);
    
    await this.adminLoginCodeModel.create({ code, expiresAt });
    const botName = this.configService.get<string>('ADMIN_BOT_NAME') || 'AdminBot';

    const tgBotUrl = `https://t.me/${botName}?start=${ADMIN_BOT_LOGIN_TO_SYSTEM_PREFIX}_${code}`;
    return { code, expiresAt, tgBotUrl };
  }


  async confirmLoginCode(telegramId: number, code: string): Promise<{token: string}> {
    const loginCode = await this.adminLoginCodeModel.findOne({ code, confirmed: false });

    if (!loginCode || loginCode.expiresAt < new Date()) throw new BadRequestException('Код недействителен или устарел');

    const foundAdmin = await this.adminModel.findOne({ telegramId }).exec();
    if (!foundAdmin) throw new UnauthorizedException('Администратор не найден');
    
    loginCode.confirmed = true;
    loginCode.admin = foundAdmin._id;
    
    await loginCode.save();

    // Генерируем токен для администратора
    const token = this.jwtService.sign({ id: foundAdmin._id.toString(), type: 'admin' });

    const admin = plainToInstance(AdminAuthDto, foundAdmin, { excludeExtraneousValues: true });
    // Уведомляем администратора по WebSocket
    this.adminAuthGateway.notifyLoginConfirmed(code, token, admin);

    // 🧹 Удаляем код после использования
    await this.adminLoginCodeModel.deleteOne({ _id: loginCode._id });

    //TODO: убрать на проде
    // временно для теста в сваггере
    return {token}
  }

  async checkAuth(authedAdmin: AuthenticatedUser): Promise<AdminAuthDto> {
    const admin = await this.adminModel.findById(authedAdmin.id).select('_id id telegramId').lean({ virtuals: true }).exec();
    if (!admin) throw new UnauthorizedException('Администратор не найден');
    
    return plainToInstance(AdminAuthDto, admin, { excludeExtraneousValues: true });
  }

}