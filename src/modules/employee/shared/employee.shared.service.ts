import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Employee } from '../employee.schema';
import { plainToInstance } from 'class-transformer';
import {
  EmployeeResponseDto,
  RequestToEmployeeResponseDto,
  EmployeeTelegramBotResponseDto,
} from './employee.shared.response.dto';
import { UploadsService } from 'src/common/modules/uploads/uploads.service';
import { EntityType } from 'src/common/modules/uploads/uploaded-file.schema';
import axios from 'axios';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { RequestToEmployee } from '../request-to-employee.schema';
import { verifyUserStatus } from 'src/common/utils';
import {LogsService} from 'src/common/modules/logs/logs.service';
import * as path from 'path';
import { EmployeeStatus } from 'src/modules/employee/employee.schema';
import { RequestToEmployeeStatus } from 'src/modules/employee/request-to-employee.schema';

@Injectable()
export class EmployeeSharedService {
  constructor(
    @InjectModel('Employee') private employeeModel: Model<Employee>,
    @InjectModel('RequestToEmployee') private requestToEmployeeModel: Model<RequestToEmployee>,

    private readonly uploadsService: UploadsService,
    private readonly logsService: LogsService
  ) {}

  // ====================================================
  // TELEGRAM HANDLERS
  // ====================================================

  async getEmployeeByTelegramId(telegramId: number): Promise<EmployeeTelegramBotResponseDto | null> {
    const employee = await this.employeeModel.findOne({ telegramId })
    .select('_id telegramId telegramUsername employeeId pinnedTo employer isBlocked verifiedStatus employeeName position salary employeeAvatar')
    .populate([
      {path: 'employer', select: '_id companyName'},
      {path: 'pinnedTo', select: '_id shopName'},
    ])
    .lean({ virtuals: true }).exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    return plainToInstance(EmployeeTelegramBotResponseDto, employee, { excludeExtraneousValues: true });
  }


  async getEmployeeRequestsByTelegramId(telegramId: number): Promise<RequestToEmployeeResponseDto[]> {
    const employee = await this.employeeModel.findOne({ telegramId }).select('_id').lean({ virtuals: true }).exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    if (employee.employer) throw new ForbiddenException('Сотрудник имеет привязанного работодателя');
    
    const requests = await this.requestToEmployeeModel.find({ to: employee._id, requestStatus: RequestToEmployeeStatus.PENDING }).populate('from', '_id companyName').lean({ virtuals: true }).exec();
    return plainToInstance(RequestToEmployeeResponseDto, requests, { excludeExtraneousValues: true });
  }


  async getEmployeeRequestById(requestToEmployeeId: string): Promise<RequestToEmployeeResponseDto> {
    const request = await this.requestToEmployeeModel.findById(requestToEmployeeId).populate('from', '_id companyName').lean({ virtuals: true }).exec();
    if (!request) throw new NotFoundException('Запрос не найден');
    return plainToInstance(RequestToEmployeeResponseDto, request, { excludeExtraneousValues: true });
  }


  async changeEmployeeRequestStatusByEmployee(
    telegramId: number,
    requestToEmployeeId: string,
    newStatus: RequestToEmployeeStatus.ACCEPTED | RequestToEmployeeStatus.REJECTED
  ): Promise<RequestToEmployeeResponseDto> {
    const employee = await this.employeeModel.findOne({ telegramId }).select('_id').lean({ virtuals: true }).exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    verifyUserStatus(employee);

    const requestToEmployee = await this.requestToEmployeeModel.findById(requestToEmployeeId).exec();
    if (!requestToEmployee) throw new NotFoundException('Запрос не найден');

    if (requestToEmployee.to.toString() !== employee._id.toString()) throw new ForbiddenException('Недостаточно прав');
    if (requestToEmployee.requestStatus !== RequestToEmployeeStatus.PENDING) throw new ForbiddenException('Запрос уже обработан');
    const oldStatus = requestToEmployee.requestStatus;

    requestToEmployee.requestStatus = newStatus;
    await requestToEmployee.save();

    if (newStatus === RequestToEmployeeStatus.ACCEPTED) {
      const foundEmployee = await this.employeeModel.findById(requestToEmployee.to).exec();
      if (!foundEmployee) throw new NotFoundException('Сотрудник не найден');
      foundEmployee.employer = requestToEmployee.from;
      await foundEmployee.save();
    }

    await this.logsService.addEmployeeLog(employee._id.toString(), LogLevel.LOW, `
      Сотрудник изменил статус запроса(${requestToEmployee._id.toString()}) от продавца(${requestToEmployee.from._id.toString()}) 
      с ${oldStatus} на ${newStatus}
    `);
    return plainToInstance(RequestToEmployeeResponseDto, requestToEmployee, { excludeExtraneousValues: true });
  }


  async leaveTheEmployer(telegramId: number): Promise<EmployeeResponseDto> {
    const employee = await this.employeeModel.findOne({ telegramId }).exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    verifyUserStatus(employee);

    if (!employee.employer) throw new ForbiddenException('Сотрудник не имеет привязанного работодателя');
    if (employee.openedShift) throw new ForbiddenException('У сотрудника есть открытая смена, нужно её закрыть');

    const oldEmployerId = employee.employer.toString();
    const oldShopId = employee.pinnedTo?.toString() || null;
    employee.employer = null;
    employee.pinnedTo = null;
    employee.status = EmployeeStatus.NOT_PINNED;
    employee.sellerNote = null;
    employee.position = null;
    employee.salary = null;
    await employee.save();

    await this.logsService.addEmployeeLog(employee._id.toString(), LogLevel.MEDIUM, 
      `Сотрудник ушел от работодателя(${oldEmployerId})`
    );
    await this.logsService.addSellerLog(oldEmployerId, LogLevel.MEDIUM, 
      `Сотрудник(${employee._id.toString()}) ушел от работодателя(${oldEmployerId})`
    );
    
    if (oldShopId) await this.logsService.addShopLog(oldShopId, LogLevel.MEDIUM, 
      `Сотрудник(${employee._id.toString()}) открепился от магазина, так как сотрудник ушел от работодателя(${oldEmployerId})`
    );

    return plainToInstance(EmployeeResponseDto, employee, { excludeExtraneousValues: true });
  }


  async updateEmployeeName(telegramId: number, name: string): Promise<EmployeeResponseDto> {
    const employee = await this.employeeModel.findOne({ telegramId }).exec();
    const oldName = employee?.employeeName;
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    employee.employeeName = name;
    await employee.save();

    await this.logsService.addEmployeeLog(employee._id.toString(), LogLevel.LOW, `Имя изменено с ${oldName} на ${name}`);

    return plainToInstance(EmployeeResponseDto, employee, { excludeExtraneousValues: true });
  }


  async updateEmployeeAvatarViaTelegram(telegramId: number, fileId: string): Promise<EmployeeResponseDto> {
    // Получаем сессию MongoDB для транзакций
    const session = await this.employeeModel.db.startSession();
    
    try {
      // Начинаем транзакцию
      session.startTransaction();

      // Находим сотрудника в рамках транзакции
      const employee = await this.employeeModel.findOne({ telegramId }).session(session).exec();
      if (!employee) throw new NotFoundException('Сотрудник не найден');

      // Получаем токен бота из переменных окружения
      const botToken = process.env.EMPLOYEE_BOT_TOKEN;
      if (!botToken) throw new InternalServerErrorException('Не установлен EMPLOYEE_BOT_TOKEN');

      // 1. Получаем file_path через Telegram API
      const getFileResponse = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      if (!getFileResponse.data.ok) {
        throw new InternalServerErrorException(`Ошибка при получении файла: ${getFileResponse.data.description}`);
      }
      const filePath = getFileResponse.data.result.file_path;
      
      // 2. Скачиваем файл как буфер
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
      const fileBufferResp = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const fileBuffer: Buffer = Buffer.from(fileBufferResp.data);
      
      // 3. Формируем объект файла для UploadsService
      const fileExtension = path.extname(filePath) || '.jpg';
      const fileObj = {
        fieldname: 'avatar',
        originalname: `avatar${fileExtension}`,
        encoding: '7bit',
        mimetype: fileExtension === '.png' ? 'image/png' : 'image/jpeg',
        buffer: fileBuffer,
        size: fileBuffer.length,
        destination: '',
        filename: '',
        path: ''
      } as Express.Multer.File;
      
      // 4. Сохраняем старый ID аватара, если есть
      const oldAvatarId = employee.employeeAvatar ? employee.employeeAvatar.toString() : null;
      
      // 5. Загружаем новый аватар через UploadsService в рамках транзакции
      const uploadedFile = await this.uploadsService.uploadImage({
        file: fileObj,
        accessLevel: 'private',
        entityType: EntityType.employee,
        entityId: employee._id.toString(),
        imageType: null, // не указываем тип изображения, т.к. для сотрудника нет специального типа
        allowedUsers: [],
        session
      });
      
      // 6. Сохраняем ссылку на новый аватар
      employee.employeeAvatar = uploadedFile._id;
      await employee.save({ session });
      
      // 7. Если был старый аватар - регистрируем его на удаление
      if (oldAvatarId && /^[a-f\d]{24}$/i.test(oldAvatarId)) {
        await this.uploadsService.deleteFile(oldAvatarId, session);
      }
      
      // Фиксируем транзакцию
      await session.commitTransaction();
      
      // 8. Добавляем лог изменения аватара
      await this.logsService.addEmployeeLog(employee._id.toString(), LogLevel.LOW, `Фото изменено`);

      return plainToInstance(EmployeeResponseDto, employee, { excludeExtraneousValues: true });

    } catch (error) {
      // При ошибке откатываем транзакцию
      await session.abortTransaction();
      
      console.error('Ошибка при обновлении аватара сотрудника:', error);
      
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Не удалось обновить аватар: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }

  }
}