# Этап 1.1: AUTH (Аутентификация)

## Краткое содержание

Модуль аутентификации и авторизации для всех ролей: Customer, Seller, Employee, Platform. JWT токены, OTP коды, Telegram OAuth, guards и декораторы.

## Предполагаемый результат

- Пользователи могут регистрироваться и входить через OTP
- JWT access/refresh токены работают
- Telegram OAuth работает
- Guards защищают endpoints
- Rate limiting на auth endpoints

---

## 1. Структура модуля

```
src/infra/auth/
├── index.ts
├── auth.module.ts
├── auth.port.ts
├── auth.service.ts
├── auth.enums.ts
├── auth.commands.ts
├── auth.queries.ts
├── entities/
│   ├── otp.schema.ts
│   └── refresh-token.schema.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── type.guard.ts
│   └── roles.guard.ts
└── decorators/
    ├── get-user.decorator.ts
    ├── user-type.decorator.ts
    └── public.decorator.ts
```

---

## 2. Enums

```typescript
// src/infra/auth/auth.enums.ts

export enum UserType {
  CUSTOMER = 'customer',
  SELLER = 'seller',
  EMPLOYEE = 'employee',
  PLATFORM = 'platform',
}

export enum OtpPurpose {
  LOGIN = 'login',
  REGISTER = 'register',
  RESET_PASSWORD = 'reset_password',
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}
```

---

## 3. Схемы

### OTP Schema

```typescript
// src/infra/auth/entities/otp.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OtpPurpose, UserType } from '../auth.enums';

@Schema({ timestamps: true, collection: 'otps' })
export class Otp {
  @Prop({ type: String, required: true, index: true })
  phone: string;

  @Prop({ type: String, required: true })
  code: string; // 6 цифр

  @Prop({ type: String, enum: OtpPurpose, required: true })
  purpose: OtpPurpose;

  @Prop({ type: String, enum: UserType, required: true })
  userType: UserType;

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Number, default: 0 })
  attempts: number; // Защита от перебора

  @Prop({ type: Boolean, default: false })
  used: boolean;
}

export type OtpDocument = Otp & Document;
export const OtpSchema = SchemaFactory.createForClass(Otp);

// TTL индекс — автоудаление через 10 минут после истечения
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });
```

### RefreshToken Schema

```typescript
// src/infra/auth/entities/refresh-token.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserType } from '../auth.enums';

@Schema({ timestamps: true, collection: 'refresh_tokens' })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: UserType, required: true })
  userType: UserType;

  @Prop({ type: String, required: true, unique: true })
  token: string; // UUID или хеш

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  @Prop({ type: String })
  deviceInfo?: string; // User-Agent для аудита

  @Prop({ type: String })
  ip?: string;

  @Prop({ type: Boolean, default: false })
  revoked: boolean;
}

export type RefreshTokenDocument = RefreshToken & Document;
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// TTL индекс
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

## 4. Port (Интерфейс)

```typescript
// src/infra/auth/auth.port.ts
import { AuthCommands, AuthQueries } from './';

export const AUTH_PORT = Symbol('AUTH_PORT');

export interface AuthPort {
  // OTP
  sendOtp(command: AuthCommands.SendOtpCommand): Promise<void>;
  verifyOtp(command: AuthCommands.VerifyOtpCommand): Promise<AuthResult>;

  // Tokens
  refreshTokens(command: AuthCommands.RefreshTokensCommand): Promise<TokenPair>;
  revokeToken(command: AuthCommands.RevokeTokenCommand): Promise<void>;
  revokeAllTokens(command: AuthCommands.RevokeAllTokensCommand): Promise<void>;

  // Telegram
  verifyTelegramAuth(command: AuthCommands.VerifyTelegramCommand): Promise<AuthResult>;

  // Validation
  validateUser(query: AuthQueries.ValidateUserQuery): Promise<AuthenticatedUser | null>;
}

export interface AuthResult {
  user: AuthenticatedUser;
  tokens: TokenPair;
  isNewUser: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AuthenticatedUser {
  id: string;
  type: UserType;
  phone?: string;
  telegramId?: number;
}
```

---

## 5. Commands

```typescript
// src/infra/auth/auth.commands.ts
import { UserType, OtpPurpose } from './auth.enums';

export class SendOtpCommand {
  constructor(
    public readonly phone: string,
    public readonly userType: UserType,
    public readonly purpose: OtpPurpose = OtpPurpose.LOGIN,
  ) {}
}

export class VerifyOtpCommand {
  constructor(
    public readonly phone: string,
    public readonly code: string,
    public readonly userType: UserType,
  ) {}
}

export class RefreshTokensCommand {
  constructor(
    public readonly refreshToken: string,
    public readonly deviceInfo?: string,
    public readonly ip?: string,
  ) {}
}

export class RevokeTokenCommand {
  constructor(public readonly refreshToken: string) {}
}

export class RevokeAllTokensCommand {
  constructor(
    public readonly userId: string,
    public readonly userType: UserType,
  ) {}
}

export class VerifyTelegramCommand {
  constructor(
    public readonly telegramData: TelegramAuthData,
    public readonly userType: UserType,
  ) {}
}

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}
```

---

## 6. Queries

```typescript
// src/infra/auth/auth.queries.ts
import { UserType } from './auth.enums';

export class ValidateUserQuery {
  constructor(
    public readonly userId: string,
    public readonly userType: UserType,
  ) {}
}
```

---

## 7. Service (реализация)

```typescript
// src/infra/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';
import { AuthPort, AuthResult, TokenPair, AuthenticatedUser } from './auth.port';
import { Otp, OtpDocument } from './entities/otp.schema';
import { RefreshToken, RefreshTokenDocument } from './entities/refresh-token.schema';
import { DomainError, DomainErrorCode } from 'src/common';
import * as AuthCommands from './auth.commands';
import * as AuthQueries from './auth.queries';

@Injectable()
export class AuthService implements AuthPort {
  private readonly OTP_EXPIRES_IN = 5 * 60 * 1000; // 5 минут
  private readonly ACCESS_TOKEN_EXPIRES_IN = '15m';
  private readonly REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000; // 30 дней
  private readonly MAX_OTP_ATTEMPTS = 5;

  constructor(
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtService,
  ) {}

  async sendOtp(command: AuthCommands.SendOtpCommand): Promise<void> {
    // Генерация 6-значного кода
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Удаляем старые неиспользованные OTP
    await this.otpModel.deleteMany({
      phone: command.phone,
      userType: command.userType,
      used: false,
    });

    // Создаём новый OTP
    await this.otpModel.create({
      phone: command.phone,
      code,
      purpose: command.purpose,
      userType: command.userType,
      expiresAt: new Date(Date.now() + this.OTP_EXPIRES_IN),
    });

    // TODO: Отправка через COMMUNICATIONS модуль
    // await this.communicationsPort.sendSms({ phone: command.phone, message: `Код: ${code}` });
    
    console.log(`[DEV] OTP for ${command.phone}: ${code}`);
  }

  async verifyOtp(command: AuthCommands.VerifyOtpCommand): Promise<AuthResult> {
    const otp = await this.otpModel.findOne({
      phone: command.phone,
      userType: command.userType,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      throw DomainError.notFound('OTP');
    }

    if (otp.attempts >= this.MAX_OTP_ATTEMPTS) {
      throw DomainError.invariant('Too many attempts');
    }

    if (otp.code !== command.code) {
      await this.otpModel.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
      throw DomainError.validation('Invalid OTP code');
    }

    // Помечаем как использованный
    await this.otpModel.updateOne({ _id: otp._id }, { used: true });

    // Получаем или создаём пользователя
    const { user, isNewUser } = await this.getOrCreateUser(command.phone, command.userType);

    // Генерируем токены
    const tokens = await this.generateTokens(user);

    return { user, tokens, isNewUser };
  }

  async refreshTokens(command: AuthCommands.RefreshTokensCommand): Promise<TokenPair> {
    const storedToken = await this.refreshTokenModel.findOne({
      token: command.refreshToken,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!storedToken) {
      throw DomainError.invariant('Invalid refresh token');
    }

    // Ротация токена — старый отзываем
    await this.refreshTokenModel.updateOne({ _id: storedToken._id }, { revoked: true });

    const user: AuthenticatedUser = {
      id: storedToken.userId.toString(),
      type: storedToken.userType,
    };

    return this.generateTokens(user, command.deviceInfo, command.ip);
  }

  async revokeToken(command: AuthCommands.RevokeTokenCommand): Promise<void> {
    await this.refreshTokenModel.updateOne(
      { token: command.refreshToken },
      { revoked: true },
    );
  }

  async revokeAllTokens(command: AuthCommands.RevokeAllTokensCommand): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId: command.userId, userType: command.userType },
      { revoked: true },
    );
  }

  async verifyTelegramAuth(command: AuthCommands.VerifyTelegramCommand): Promise<AuthResult> {
    const { telegramData, userType } = command;

    // Проверка подписи Telegram
    if (!this.verifyTelegramHash(telegramData)) {
      throw DomainError.validation('Invalid Telegram auth');
    }

    // Проверка времени (не старше 24 часов)
    const authAge = Date.now() / 1000 - telegramData.auth_date;
    if (authAge > 86400) {
      throw DomainError.validation('Telegram auth expired');
    }

    // Получаем или создаём пользователя
    const { user, isNewUser } = await this.getOrCreateUserByTelegram(telegramData, userType);
    const tokens = await this.generateTokens(user);

    return { user, tokens, isNewUser };
  }

  async validateUser(query: AuthQueries.ValidateUserQuery): Promise<AuthenticatedUser | null> {
    // TODO: Проверка существования пользователя в соответствующем модуле
    // Пока просто возвращаем данные из токена
    return {
      id: query.userId,
      type: query.userType,
    };
  }

  // === Private methods ===

  private async generateTokens(
    user: AuthenticatedUser,
    deviceInfo?: string,
    ip?: string,
  ): Promise<TokenPair> {
    const payload = { sub: user.id, type: user.type };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    });

    const refreshToken = uuidv4();

    await this.refreshTokenModel.create({
      userId: user.id,
      userType: user.type,
      token: refreshToken,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_IN),
      deviceInfo,
      ip,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 минут
    };
  }

  private async getOrCreateUser(
    phone: string,
    userType: UserType,
  ): Promise<{ user: AuthenticatedUser; isNewUser: boolean }> {
    // TODO: Вызов соответствующего модуля через порт
    // Пока заглушка
    throw new Error('Not implemented: getOrCreateUser');
  }

  private async getOrCreateUserByTelegram(
    telegramData: AuthCommands.TelegramAuthData,
    userType: UserType,
  ): Promise<{ user: AuthenticatedUser; isNewUser: boolean }> {
    // TODO: Вызов соответствующего модуля через порт
    throw new Error('Not implemented: getOrCreateUserByTelegram');
  }

  private verifyTelegramHash(data: AuthCommands.TelegramAuthData): boolean {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return false;

    const { hash, ...rest } = data;
    const checkString = Object.keys(rest)
      .sort()
      .map((k) => `${k}=${rest[k]}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(checkString).digest('hex');

    return computedHash === hash;
  }
}
```

---

## 8. JWT Strategy

```typescript
// src/infra/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../auth.port';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; type: string }): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.type) {
      throw new UnauthorizedException();
    }

    return {
      id: payload.sub,
      type: payload.type as any,
    };
  }
}
```

---

## 9. Module

```typescript
// src/infra/auth/auth.module.ts
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AUTH_PORT } from './auth.port';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Otp, OtpSchema } from './entities/otp.schema';
import { RefreshToken, RefreshTokenSchema } from './entities/refresh-token.schema';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'auth',
        ttl: 60000, // 1 минута
        limit: 10,  // 10 запросов
      },
    ]),
  ],
  providers: [
    { provide: AUTH_PORT, useClass: AuthService },
    JwtStrategy,
  ],
  exports: [AUTH_PORT, JwtModule, PassportModule],
})
export class AuthModule {}
```

---

## 10. Endpoints

```typescript
// src/interface/http/auth/auth.controller.ts

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_PORT) private readonly authPort: AuthPort,
  ) {}

  @Post('otp/send')
  @Throttle({ auth: { limit: 5, ttl: 60000 } }) // 5 req/min
  @Public()
  async sendOtp(@Body() dto: SendOtpDto): Promise<void> {
    await this.authPort.sendOtp(
      new AuthCommands.SendOtpCommand(dto.phone, dto.userType),
    );
  }

  @Post('otp/verify')
  @Public()
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    const result = await this.authPort.verifyOtp(
      new AuthCommands.VerifyOtpCommand(dto.phone, dto.code, dto.userType),
    );
    return AuthResponseDto.from(result);
  }

  @Post('refresh')
  @Public()
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenPairDto> {
    const tokens = await this.authPort.refreshTokens(
      new AuthCommands.RefreshTokensCommand(dto.refreshToken),
    );
    return TokenPairDto.from(tokens);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.authPort.revokeToken(
      new AuthCommands.RevokeTokenCommand(dto.refreshToken),
    );
  }

  @Post('telegram/callback')
  @Public()
  async telegramCallback(@Body() dto: TelegramAuthDto): Promise<AuthResponseDto> {
    const result = await this.authPort.verifyTelegramAuth(
      new AuthCommands.VerifyTelegramCommand(dto.telegramData, dto.userType),
    );
    return AuthResponseDto.from(result);
  }
}
```

---

## 11. Взаимодействие с другими модулями

| Модуль | Взаимодействие |
|--------|----------------|
| CUSTOMER | Создание/поиск клиента при верификации OTP |
| BUSINESS | Создание/поиск селлера при верификации |
| WORKFORCE | Создание/поиск сотрудника |
| PLATFORM | Создание/поиск админа |
| COMMUNICATIONS | Отправка SMS с OTP кодом |

---

## Чеклист готовности

- [ ] OTP отправляется и верифицируется
- [ ] JWT токены генерируются
- [ ] Refresh token ротация работает
- [ ] Telegram OAuth работает
- [ ] Rate limiting блокирует при превышении
- [ ] Guards защищают endpoints
- [ ] Интеграция с CUSTOMER для создания пользователей
