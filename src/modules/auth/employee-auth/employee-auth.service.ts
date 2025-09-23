import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, NotFoundException, Inject, forwardRef} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import {
  EmployeeAuthResponseDto,
  LoginCodeForEmployeeToShopResponseDto
} from './employee-auth.response.dto';
import { RegisterEmployeeDto } from './employee-auth.request.dto';
import { Employee } from 'src/modules/employee/employee.schema';
import { EmployeeLoginCode } from './employee-login-code.schema';
import { plainToInstance } from 'class-transformer';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { AuthenticatedUser, AuthenticatedEmployee } from 'src/common/types';
import { Shift } from 'src/modules/shift/shift.schema';
import { Shop } from 'src/modules/shop/shop/shop.schema';
import { EMPLOYEE_AUTH_CODE_EXPIRES_IN, EMPLOYEE_BOT_LOGIN_TO_SHOP_PREFIX } from 'src/common/constants';
import { EmployeeAuthGateway } from './employee-auth.gateway';
import { ConfigService } from '@nestjs/config';
import { checkId, generateAuthCode } from 'src/common/utils';
import { NotificationService } from 'src/infra/notification/notification.service';

@Injectable()
export class EmployeeAuthService {
  constructor(
    @InjectModel('Employee') private employeeModel: Model<Employee>,
    @InjectModel('EmployeeLoginCode') private employeeLoginCodeModel: Model<EmployeeLoginCode>,
    @InjectModel('Shift') private shiftModel: Model<Shift>,
    @InjectModel('Shop') private shopModel: Model<Shop>,
    private readonly employeeAuthGateway: EmployeeAuthGateway,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService
  ) {}

  async registerViaTelegram(dto: RegisterEmployeeDto): Promise<EmployeeAuthResponseDto> {
    const phoneNumber = parsePhoneNumberFromString(dto.phone, 'RU');
    if (!phoneNumber || !phoneNumber.isValid()) throw new BadRequestException('Некорректный номер телефона');

    const existingEmployee = await this.employeeModel.findOne({
      $or: [
        { phone: phoneNumber.number },
        { telegramId: dto.telegramId }
      ]
    }).exec();

    //TODO: додумать обработку уже зарегистрированного пользователя
    // if (existingEmployee) return this.loginViaTelegram(existingEmployee.telegramId);
    if (existingEmployee) throw new BadRequestException('Пользователь с таким номером телефона или ID телеграм уже существует');
    
    const createdEmployee = new this.employeeModel({
      phone: phoneNumber.number,
      telegramId: dto.telegramId,
      telegramUsername: dto.telegramUsername,
      telegramFirstName: dto.telegramFirstName,
      telegramLastName: dto.telegramLastName,
      lastLoginAt: new Date(),
      employeeName: dto.employeeName,
    });

    await createdEmployee.save();

    return plainToInstance(EmployeeAuthResponseDto, createdEmployee, { excludeExtraneousValues: true });
  }


  // ====================================================
  // LOGIN EMPLOYEE TO SHOP 
  // ====================================================

  async generateLoginCode(authedShop: AuthenticatedUser): Promise<LoginCodeForEmployeeToShopResponseDto> {
    const activeShift = await this.shiftModel.findOne({
      shop: new Types.ObjectId(authedShop.id),
      closedAt: null
    }).exec();
    if (activeShift) throw new ForbiddenException('У магазина уже есть активная смена');

    const foundShop = await this.shopModel.findById(authedShop.id).lean({}).exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    
    const code = generateAuthCode();
    const expiresAt = new Date(Date.now() + EMPLOYEE_AUTH_CODE_EXPIRES_IN);

    await this.employeeLoginCodeModel.create({ code, shop: new Types.ObjectId(authedShop.id), expiresAt });

    const botName = this.configService.get<string>('EMPLOYEE_BOT_NAME') || 'EmployeeBot';
    const tgBotUrl = `https://t.me/${botName}?start=${EMPLOYEE_BOT_LOGIN_TO_SHOP_PREFIX}_${code}`;
    return { code, expiresAt, tgBotUrl};
  }

  
  async confirmLoginCode( telegramId: number, code: string): Promise<{token: string}> {
    const loginCode = await this.employeeLoginCodeModel.findOne({ code, confirmed: false });

    if (!loginCode || loginCode.expiresAt < new Date()) throw new BadRequestException('Код недействителен или устарел');

    const foundEmployee = await this.employeeModel.findOne({ telegramId }).exec();
    if (!foundEmployee) throw new UnauthorizedException('Сотрудник не найден');
    // checkVerifiedStatus(employee)
    if (
      !foundEmployee._id.equals(loginCode.employee) &&
      foundEmployee.pinnedTo &&
      foundEmployee.pinnedTo.toString() !== loginCode.shop.toString()
    ) throw new ForbiddenException('Сотрудник не прикреплен к этому магазину');
    
    // Проверка наличия активной смены у магазина
    const activeShift = await this.shiftModel.findOne({
      shop: new Types.ObjectId(loginCode.shop),
      closedAt: null
    }).exec();
    if (activeShift) throw new ForbiddenException('У магазина уже есть активная смена');
    
    loginCode.confirmed = true;
    loginCode.employee = foundEmployee._id;
    
    await loginCode.save();

    // Генерируем токен для сотрудника
    const token = this.jwtService.sign({
      employeeId: foundEmployee._id.toString(),
      type: 'employee',
      shopId: loginCode.shop.toString()
    }, { expiresIn: '24h' });

    const employee = plainToInstance(EmployeeAuthResponseDto, foundEmployee, { excludeExtraneousValues: true });
    // Уведомляем клиента по WebSocket
    this.employeeAuthGateway.notifyLoginConfirmed(code, token, employee);

    // 🧹 Удаляем код после использования
    await this.employeeLoginCodeModel.deleteOne({ _id: loginCode._id });

    //TODO: убрать на проде
    // временно для теста в сваггере
    return {token}
  }


  async loginViaTelegram (authedShop: AuthenticatedUser, employeeId: string): Promise<LoginCodeForEmployeeToShopResponseDto> {
    const foundShop = await this.shopModel.findById(authedShop.id).lean({}).exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    
    const code = generateAuthCode();
    const expiresAt = new Date(Date.now() + EMPLOYEE_AUTH_CODE_EXPIRES_IN);
    const botName = this.configService.get<string>('EMPLOYEE_BOT_NAME') || 'EmployeeBot';
    const tgBotUrl = `https://t.me/${botName}?start=${EMPLOYEE_BOT_LOGIN_TO_SHOP_PREFIX}_${code}`;

    checkId([employeeId]);
    const foundEmployee = await this.employeeModel.findById(new Types.ObjectId(employeeId)).lean({}).exec();
    if (!foundEmployee) throw new NotFoundException('Сотрудник не найден');
    
    if (foundEmployee.pinnedTo && foundEmployee.pinnedTo.toString() !== foundShop._id.toString()) throw new ForbiddenException('Сотрудник не прикреплен к этому магазину');
    if (foundEmployee.employer && foundEmployee.employer.toString() !== foundShop.owner.toString()) throw new ForbiddenException('Сотрудник не прикреплен к этому продавцу');
    
    const foundLoginCode = await this.employeeLoginCodeModel.findOne({ employee: foundEmployee._id, shop: new Types.ObjectId(authedShop.id) }).exec();
    if (foundLoginCode) {
      this.notificationService.notifyEmployeeAboutLoginToShop(foundEmployee.telegramId, foundLoginCode);
      return { code: foundLoginCode.code, expiresAt: foundLoginCode.expiresAt, tgBotUrl };
    }
    const createdLoginCode = await this.employeeLoginCodeModel.create({ code, shop: new Types.ObjectId(authedShop.id), shopName: foundShop.shopName, expiresAt, employee: foundEmployee._id })
    this.notificationService.notifyEmployeeAboutLoginToShop(foundEmployee.telegramId, createdLoginCode);

    return { code, expiresAt, tgBotUrl};
  }


  async confirmLoginToShop(loginCode: EmployeeLoginCode) {
    const foundLoginCode = await this.employeeLoginCodeModel.findById(loginCode._id).exec();
    if (!foundLoginCode) throw new NotFoundException('Код не найден');
    
    foundLoginCode.confirmed = true;
    await foundLoginCode.save();

    if (!loginCode || loginCode.expiresAt < new Date()) throw new BadRequestException('Код недействителен или устарел');

    const foundEmployee = await this.employeeModel.findById( loginCode.employee).exec();
    if (!foundEmployee) throw new UnauthorizedException('Сотрудник не найден');
    // checkVerifiedStatus(employee)
    if (
      foundEmployee.pinnedTo &&
      foundEmployee.pinnedTo.toString() !== loginCode.shop.toString()
    ) throw new ForbiddenException('Сотрудник не прикреплен к этому магазину');
    
    loginCode.confirmed = true;
    loginCode.employee = foundEmployee._id;
    await loginCode.save();

    // Генерируем токен для сотрудника
    const token = this.jwtService.sign({
      employeeId: foundEmployee._id.toString(),
      type: 'employee',
      shopId: loginCode.shop.toString()
    }, { expiresIn: '24h' });

    const employee = plainToInstance(EmployeeAuthResponseDto, foundEmployee, { excludeExtraneousValues: true });

    this.employeeAuthGateway.notifyLoginConfirmed(loginCode.code, token, employee);

    await this.employeeLoginCodeModel.deleteOne({ _id: loginCode._id });
    return {token}
  }

  async rejectLoginToShop(loginCode: EmployeeLoginCode) {
    await this.employeeLoginCodeModel.deleteOne({ _id: loginCode._id });
  }


  async checkEmployeeInShopAuth(authedShop: AuthenticatedUser, authedEmployee: AuthenticatedEmployee): Promise<EmployeeAuthResponseDto> {
    const foundShop = await this.shopModel.findById(authedShop.id).select('_id owner').lean({}).exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');

    const foundEmployee = await this.employeeModel.findById(authedEmployee.id).select('_id employeeId isBlocked verifiedStatus employeeName telegramId phone pinnedTo employer').exec();
    if (!foundEmployee) throw new UnauthorizedException('Сотрудник не найден');
    
    if (foundEmployee.employer && foundEmployee.employer.toString() !== foundShop.owner.toString()) throw new ForbiddenException('Сотрудник не прикреплен к этому продавцу');
    if (foundEmployee.pinnedTo && foundEmployee.pinnedTo.toString() !== foundShop._id.toString()) throw new ForbiddenException('Сотрудник не прикреплен к этому магазину');

    return plainToInstance(EmployeeAuthResponseDto, foundEmployee, { excludeExtraneousValues: true });
  }
} 