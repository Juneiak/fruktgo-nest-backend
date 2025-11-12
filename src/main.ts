import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { MongooseExceptionFilter } from './common/filters/mongo-exception.filter';
import { DomainErrorFilter } from './common/errors';
import * as express from 'express';

import { TelegramEmployeeBotService } from './modules/telegram/employee-bot/telegram-employee-bot.service';
import { TelegramSellerBotService } from './modules/telegram/seller-bot/telegram-seller-bot.service';
import { TelegramCustomerBotService } from './modules/telegram/customer-bot/telegram-customer-bot.service';
import { TelegramAdminBotService } from './modules/telegram/admin-bot/telegram-admin-bot.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Настройка CORS
  app.enableCors({
    origin: ['http://localhost:3001', 'https://fruktgo.ru', 'https://seller.fruktgo.ru', 'https://admin.fruktgo.ru'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Настройка Swagger
  const config = new DocumentBuilder()
    .setTitle('Fructoza API')
    .setDescription('Документация API для Fructoza')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      in: 'header',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization'
    }, 'JWT-auth')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    autoTagControllers: false,
  });
  SwaggerModule.setup('api', app, document);

  app.use(express.json());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Глобальные фильтры для обработки ошибок
  app.useGlobalFilters(
    new DomainErrorFilter(),        // Обработка доменных ошибок
    new MongooseExceptionFilter(),  // Обработка ошибок Mongoose
  );

  // Интеграция всех Telegram Bot сервисов
  const telegramEmployeeBotService = app.get(TelegramEmployeeBotService);
  await telegramEmployeeBotService.setApp(app);
  
  const telegramSellerBotService = app.get(TelegramSellerBotService);
  await telegramSellerBotService.setApp(app);
  
  const telegramCustomerBotService = app.get(TelegramCustomerBotService);
  await telegramCustomerBotService.setApp(app);

  const telegramAdminBotService = app.get(TelegramAdminBotService);
  await telegramAdminBotService.setApp(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
