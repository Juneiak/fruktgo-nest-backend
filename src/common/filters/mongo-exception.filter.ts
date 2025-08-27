import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import * as mongoose from 'mongoose';

@Catch(mongoose.Error)
export class MongooseExceptionFilter implements ExceptionFilter {
  catch(exception: mongoose.Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.BAD_REQUEST;
    let message = exception.message;

    // Обработка конкретных ошибок Mongoose
    if (exception instanceof mongoose.Error.CastError) {
      message = 'Некорректный идентификатор.';
    } else if (exception instanceof mongoose.Error.ValidationError) {
      message = 'Ошибка валидации: ' + Object.values(exception.errors)
        .map(err => err.message)
        .join(', ');
    }
    // Здесь можно добавить дополнительные проверки для других типов ошибок Mongoose

    
    response.status(statusCode).json({
      statusCode,
      error: exception.name,
      message,
    });
  }
  
}