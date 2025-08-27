import { NestFactory } from '@nestjs/core';
import { Admin, AdminSchema } from '../modules/admin/admin.schema';
import * as bcrypt from 'bcrypt';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { Model } from 'mongoose';

// Создаем минимальный модуль, содержащий только необходимые зависимости
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
    ]),
  ],
})
class SeedModule {}

async function bootstrap() {
  // Создаем минимальный контекст приложения
  const app = await NestFactory.createApplicationContext(SeedModule);
  const adminModel = app.get<Model<Admin>>(getModelToken(Admin.name));
  const configService = app.get(ConfigService);

  const adminTelegramId = configService.get<string>('ADMIN_TELEGRAM_ID', '123456789');

  console.log(`Создание администратора с Telegram ID: ${adminTelegramId}`);
  
  try {
    const adminExists = await adminModel.findOne({ telegramId: adminTelegramId });
  if (!adminExists) {
    await adminModel.create({ telegramId: adminTelegramId });
    console.log('Admin created');
  } else {
    console.log('Admin already exists');
  }

    await app.close();
    console.log('Скрипт выполнен успешно!');
  } catch (error) {
    console.error('Ошибка при выполнении скрипта:', error);
    await app.close();
    process.exit(1);
  }
}

bootstrap();