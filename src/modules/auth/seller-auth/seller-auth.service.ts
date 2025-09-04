import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { 
  LoginCodeForSellerResponseDto,
  LoginCodeForShopResponseDto,
  ShopAuthResponseDto,
  SellerAuthResponseDto,
} from './seller-auth.response.dto';
import { RegisterSellerDto } from './seller-auth.request.dto';
import { plainToInstance } from 'class-transformer';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { SellerLoginCode } from './seller-login-code.schema';
import { ShopLoginCode } from './shop-login-code.schema';
import { Seller } from 'src/modules/seller/seller.schema';
import { Shop } from 'src/modules/shop/shop/shop.schema';
import { SellerAuthGateway } from './seller-auth.gateway';
import {
  SELLER_AUTH_CODE_EXPIRES_IN,
  SHOP_AUTH_CODE_EXPIRES_IN,
  SELLER_BOT_LOGIN_TO_SELLER_DASHBOARD_PREFIX,
  SELLER_BOT_LOGIN_TO_SHOP_PREFIX
} from 'src/common/constants';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { generateAuthCode } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';

@Injectable()
export class SellerAuthService {
  constructor(
    @InjectModel('Seller') private sellerModel: Model<Seller>,
    @InjectModel('Shop') private shopModel: Model<Shop>,
    @InjectModel('SellerLoginCode') private sellerLoginCodeModel: Model<SellerLoginCode>,
    @InjectModel('ShopLoginCode') private shopLoginCodeModel: Model<ShopLoginCode>,
    private readonly sellerAuthGateway: SellerAuthGateway,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}


  // ====================================================
  // AUTH TO SELLER DASHBOARD 
  // ====================================================
  async registerSellerViaTelegram(dto: RegisterSellerDto): Promise<SellerAuthResponseDto> {
    const phoneNumber = parsePhoneNumberFromString(dto.phone, 'RU');
    if (!phoneNumber || !phoneNumber.isValid()) throw new BadRequestException('Некорректный номер телефона');

    const existingSeller = await this.sellerModel.findOne({
      $or: [
        { phone: phoneNumber.number },
        { telegramId: dto.telegramId }
      ]
    }).exec();

    //TODO: додумать обработку уже зарегистрированного пользователя
    // if (existingEmployee) return this.loginViaTelegram(existingEmployee.telegramId);
    if (existingSeller) throw new BadRequestException('Пользователь с таким номером телефона или ID телеграм уже существует');
    
    const createdSeller = new this.sellerModel({
      phone: phoneNumber.number,
      telegramId: dto.telegramId,
      telegramUsername: dto.telegramUsername,
      telegramFirstName: dto.telegramFirstName,
      telegramLastName: dto.telegramLastName,
      lastLoginAt: new Date(),
    });
    await createdSeller.save();

    return plainToInstance(SellerAuthResponseDto, createdSeller, { excludeExtraneousValues: true });
  }


  async generateLoginCodeForSeller(): Promise<LoginCodeForSellerResponseDto> {
    const code = generateAuthCode();
    const expiresAt = new Date(Date.now() + SELLER_AUTH_CODE_EXPIRES_IN);
    await this.sellerLoginCodeModel.create({ code, expiresAt });
    const botName = this.configService.get<string>('SELLER_BOT_NAME') || 'SellerBot';
    const tgBotUrl = `https://t.me/${botName}?start=${SELLER_BOT_LOGIN_TO_SELLER_DASHBOARD_PREFIX}_${code}`;
    return { code, expiresAt, tgBotUrl };
  }


  async confirmLoginSellerCode(code: string, telegramId: number): Promise<{token: string}> {
    const sellerLoginCode = await this.sellerLoginCodeModel.findOne({ code, confirmed: false });

    if (!sellerLoginCode || sellerLoginCode.expiresAt < new Date()) throw new BadRequestException('Код недействителен или устарел');

    const foundSeller = await this.sellerModel.findOne({ telegramId }).exec();
    if (!foundSeller) throw new UnauthorizedException('Продавец не найден');
    // checkVerifiedStatus(employee)
    
    foundSeller.lastLoginAt = new Date();
    await foundSeller.save();

    sellerLoginCode.confirmed = true;
    sellerLoginCode.seller = foundSeller._id;
    
    await sellerLoginCode.save();

    // Генерируем токен для продавца
    const token = this.jwtService.sign({ id: foundSeller._id.toString(), type: 'seller' });

    const seller = plainToInstance(SellerAuthResponseDto, foundSeller, { excludeExtraneousValues: true });
    // Уведомляем клиента по WebSocket
    this.sellerAuthGateway.notifySellerLoginConfirmed(code, token, seller);

    // 🧹 Удаляем код после использования
    await this.sellerLoginCodeModel.deleteOne({ _id: sellerLoginCode._id });
    
    //TODO: убрать на проде
    // временно для теста в сваггере
    return {token}
  }


  async checkSellerAuth(authedSeller: AuthenticatedUser): Promise<SellerAuthResponseDto> {
    const seller = await this.sellerModel.findById(authedSeller.id).select('_id sellerId isBlocked telegramId verifiedStatus').lean({ virtuals: true }).exec();
    if (!seller) throw new UnauthorizedException('Продавец не найден');
    
    return plainToInstance(SellerAuthResponseDto, seller, { excludeExtraneousValues: true });
  }



  // ====================================================
  // LOGIN TO SHOP
  // ====================================================
  async generateLoginCodeForShop(): Promise<LoginCodeForShopResponseDto> {
    const code = generateAuthCode();
    const expiresAt = new Date(Date.now() + SHOP_AUTH_CODE_EXPIRES_IN);
    await this.shopLoginCodeModel.create({ code, expiresAt });
    const botName = this.configService.get<string>('SELLER_BOT_NAME') || 'SellerBot';
    const tgBotUrl = `https://t.me/${botName}?start=${SELLER_BOT_LOGIN_TO_SHOP_PREFIX + code}`;
    return { code, expiresAt, tgBotUrl };
  }


  async confirmLoginCodeForShop(code: string, telegramId: number, shopId: string): Promise<{token: string}> {
    const shopLoginCode = await this.shopLoginCodeModel.findOne({ code, confirmed: false });

    if (!shopLoginCode || shopLoginCode.expiresAt < new Date()) throw new BadRequestException('Код недействителен или устарел');

    const foundSeller = await this.sellerModel.findOne({ telegramId }).select('_id').lean({ virtuals: true }).exec();
    if (!foundSeller) throw new UnauthorizedException('Продавец не найден');
  
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('_id owner isBlocked telegramId verifiedStatus').lean({ virtuals: true }).exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    if (foundShop.owner.toString() !== foundSeller._id.toString()) throw new ForbiddenException('Недостаточно прав');
    
    shopLoginCode.confirmed = true;
    shopLoginCode.shop = new Types.ObjectId(shopId);
    shopLoginCode.owner = new Types.ObjectId(shopId);
    
    await shopLoginCode.save();

    // Генерируем токен для магазина
    const token = this.jwtService.sign({ id: foundShop._id.toString(), type: 'shop' });

    // Уведомляем клиента по WebSocket
    const shop = plainToInstance(ShopAuthResponseDto, foundShop, { excludeExtraneousValues: true });
    this.sellerAuthGateway.notifyShopLoginConfirmed(code, token, shop);

    // 🧹 Удаляем код после использования
    await this.shopLoginCodeModel.deleteOne({ _id: shopLoginCode._id });

    //TODO: убрать на проде
    // временно для теста в сваггере
    return {token}
  }


  async checkShopAuth(authedShop: AuthenticatedUser): Promise<ShopAuthResponseDto> {
    const shop = await this.shopModel.findById(authedShop.id).select('_id shopId isBlocked verifiedStatus owner').lean({ virtuals: true }).exec();
    if (!shop) throw new UnauthorizedException('Магазин не найден');
    
    return plainToInstance(ShopAuthResponseDto, shop, { excludeExtraneousValues: true });
  }
}