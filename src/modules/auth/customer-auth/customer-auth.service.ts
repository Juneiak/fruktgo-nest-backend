import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { CustomerAuthResponseDto, LoginCodeResponseDto } from './customer-auth.response.dto';
import { Customer } from 'src/modules/customer/schemas/customer.schema';
import { plainToInstance } from 'class-transformer';
import { Cart } from 'src/modules/customer/schemas/cart.schema';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { CUSTOMER_AUTH_CODE_EXPIRES_IN, CUSTOMER_BOT_LOGIN_TO_SYSTEM_PREFIX } from 'src/common/constants';
import { generateAuthCode } from 'src/common/utils';
import { CustomerLoginCode } from './customer-login-code.schema';
import { CustomerAuthGateway } from './customer-auth.gateway';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from 'src/common/types';
import { RegisterCustomerDto } from './customer-auth.request.dto';

@Injectable()
export class CustomerAuthService {
  constructor(
    @InjectModel('Customer') private customerModel: Model<Customer>,
    @InjectModel('Cart') private cartModel: Model<Cart>,
    @InjectModel('CustomerLoginCode') private customerLoginCodeModel: Model<CustomerLoginCode>,
    private readonly customerAuthGateway: CustomerAuthGateway,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

 
   async registerViaTelegram(dto: RegisterCustomerDto): Promise<CustomerAuthResponseDto> {
    const phoneNumber = parsePhoneNumberFromString(dto.phone, 'RU');
    if (!phoneNumber || !phoneNumber.isValid()) throw new BadRequestException('Некорректный номер телефона');

    const existingCustomer = await this.customerModel.findOne({
      $or: [
        { phone: phoneNumber.number },
        { telegramId: dto.telegramId }
      ]
    }).exec();

    //TODO: додумать обработку уже зарегистрированного пользователя
    if (existingCustomer) throw new BadRequestException('Клиент уже зарегистрирован');

    // Создаем корзину для этого клиента
    const createdCart = new this.cartModel();
    await createdCart.save();
    const createdCustomer = new this.customerModel({
      phone: phoneNumber.number,
      telegramId: dto.telegramId,
      telegramUsername: dto.telegramUsername,
      telegramFirstName: dto.telegramFirstName,
      telegramLastName: dto.telegramLastName,
      lastLoginAt: new Date(),
      customerName: dto.customerName,
      cart: createdCart._id
    });
    await createdCustomer.save();
    createdCart.customer = createdCustomer._id;
    await createdCart.save();

    return plainToInstance(CustomerAuthResponseDto, createdCustomer, { excludeExtraneousValues: true });
   }
   
 
   async generateLoginCode(): Promise<LoginCodeResponseDto> {
    const code = generateAuthCode();
    const expiresAt = new Date(Date.now() + CUSTOMER_AUTH_CODE_EXPIRES_IN);
    await this.customerLoginCodeModel.create({ code, expiresAt });
    const botName = this.configService.get<string>('CUSTOMER_BOT_NAME') || 'CustomerBot';

    const tgBotUrl = `https://t.me/${botName}?start=${CUSTOMER_BOT_LOGIN_TO_SYSTEM_PREFIX}_${code}`;
    return { code, expiresAt, tgBotUrl };
   }
 

   async confirmLoginCode(telegramId: number, code: string): Promise<{token: string}> {
    const loginCode = await this.customerLoginCodeModel.findOne({ code, confirmed: false });

    if (!loginCode || loginCode.expiresAt < new Date()) throw new BadRequestException('Код недействителен или устарел');

    const foundCustomer = await this.customerModel.findOne({ telegramId }).exec();
    if (!foundCustomer) throw new UnauthorizedException('Клиент не найден');
    
    foundCustomer.lastLoginAt = new Date();
    await foundCustomer.save();

    loginCode.confirmed = true;
    loginCode.customer = foundCustomer._id;
    
    await loginCode.save();

    // Генерируем токен для клиента
    const token = this.jwtService.sign({ id: foundCustomer._id.toString(), type: 'customer' });

    const customer = plainToInstance(CustomerAuthResponseDto, foundCustomer, { excludeExtraneousValues: true });
    // Уведомляем клиента по WebSocket
    this.customerAuthGateway.notifyLoginConfirmed(code, token, customer);

    // 🧹 Удаляем код после использования
    await this.customerLoginCodeModel.deleteOne({ _id: loginCode._id });

    //TODO: убрать на проде
    // временно для теста в сваггере
    return {token}
   }


  async checkAuth(authedCustomer: AuthenticatedUser): Promise<CustomerAuthResponseDto> {
    const customer = await this.customerModel.findById(authedCustomer.id).select('_id customerId isBlocked verifiedStatus').lean({ virtuals: true }).exec();
    if (!customer) throw new UnauthorizedException('Клиент не найден');
    return plainToInstance(CustomerAuthResponseDto, customer, { excludeExtraneousValues: true });
  }
}