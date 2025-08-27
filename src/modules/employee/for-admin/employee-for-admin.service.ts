
import { Injectable, NotFoundException} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee } from '../schemas/employee.schema';
import {
  EmployeeForAdminPreviewResponseDto,
  EmployeeForAdminFullResponseDto,
  UpdateEmployeeByAdminDto,
  EmployeeShiftPreviewResponseDto
} from './employee-for-admin.dtos';
import { plainToInstance } from 'class-transformer';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { LogsService } from 'src/common/modules/logs/logs.service';
import {checkId} from 'src/common/utils';
import {AuthenticatedUser} from 'src/common/types';
import { PaginatedResponseDto, PaginationMetaDto, PaginationQueryDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@Injectable()
export class EmployeeForAdminService {
  constructor(
    @InjectModel('Employee') private employeeModel: Model<Employee>,
    private readonly logsService: LogsService
  ) {}

  async getEmployees(
    authedAdmin: AuthenticatedUser, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<EmployeeForAdminPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество сотрудников для пагинации
    const totalItems = await this.employeeModel.countDocuments().exec();
    
    // Получаем сотрудников с пагинацией
    const employees = await this.employeeModel.find()
      .select('+internalNote')
      .populate('pinnedTo', 'shopId shopName')
      .populate('employer', 'sellerId companyName')
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    // Формируем метаданные пагинации
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(EmployeeForAdminPreviewResponseDto, employees, { excludeExtraneousValues: true });
    return { items, pagination };
  }

  async getEmployee(authedAdmin: AuthenticatedUser,employeeId: string): Promise<EmployeeForAdminFullResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findOne({ _id: employeeId }).select('+internalNote')
    .populate('pinnedTo', 'shopId shopName')
    .populate('employer', 'sellerId companyName')
    .lean({ virtuals: true })
    .exec();
    return plainToInstance(EmployeeForAdminFullResponseDto, employee, { excludeExtraneousValues: true });
  }

  async getEmployeeLogs(authedAdmin: AuthenticatedUser, employeeId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    return this.logsService.getAllEmployeeLogs(employeeId, paginationQuery);
  }

  async updateEmployee(
    authedAdmin: AuthenticatedUser,
    employeeId: string,
    dto: UpdateEmployeeByAdminDto
  ): Promise<EmployeeForAdminFullResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findById(employeeId);
    if (!employee) throw new NotFoundException(`Сотрудник с ID ${employeeId} не найден`);
    
    // Собираем изменения для лога
    const changes: string[] = [];
    
    if (dto.isBlocked !== undefined && dto.isBlocked !== employee.isBlocked) {
      const oldValue = employee.isBlocked ? 'Да' : 'Нет';
      const newValue = dto.isBlocked ? 'Да' : 'Нет';
      employee.isBlocked = dto.isBlocked;
      changes.push(`Блокировка: ${oldValue} -> ${newValue}`);
    }
    
    if (dto.verifiedStatus && dto.verifiedStatus !== employee.verifiedStatus) {
      const oldValue = employee.verifiedStatus;
      employee.verifiedStatus = dto.verifiedStatus;
      changes.push(`Статус верификации: "${oldValue}" -> "${dto.verifiedStatus}"`);
    }
    
    if (dto.internalNote && dto.internalNote !== employee.internalNote) {
      const oldValue = employee.internalNote || 'Нет';
      employee.internalNote = dto.internalNote;
      changes.push(`Заметка администратора: "${oldValue}" -> "${dto.internalNote}"`);
    }
    
    // Если были изменения, сохраняем и логируем
    if (changes.length > 0) {
      // Сохраняем изменения
      await employee.save();
      
      // Формируем текст лога
      const logText = `Администратор обновил данные сотрудника (${employee.employeeName}):\n${changes.join('\n')}`;
      
      // Добавляем запись в лог
      await this.logsService.addEmployeeLog(employee._id.toString(),LogLevel.SERVICE,logText);
    }
    
    // Получаем обновленные данные с полем internalNote и связанными логами
    const updatedEmployee = await this.employeeModel.findById(employeeId).select('+internalNote').populate('logs').lean({ virtuals: true }).exec();
    
    return this.getEmployee(authedAdmin, employeeId);
  }

  async getEmployeeShifts(
    authedAdmin: AuthenticatedUser, 
    employeeId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<EmployeeShiftPreviewResponseDto>> {
    checkId([employeeId]);
    const { page = 1, pageSize = 10 } = paginationQuery;
    
    // Находим сотрудника и получаем данные о сменах
    const employee = await this.employeeModel.findById(employeeId)
      .select('+internalNote')
      .populate({
        path: 'openedShifts',
        model: 'Shift',
        options: { sort: { createdAt: -1 } },
        populate: {
          path: 'shop',
          model: 'Shop',
          select: 'shopId shopName'
        }
      }).lean({ virtuals: true }).exec();

    if (!employee) throw new NotFoundException(`Сотрудник с ID ${employeeId} не найден`);
    
    // Получаем общее количество смен
    const totalItems = employee.openedShifts ? employee.openedShifts.length : 0;
    
    // Применяем пагинацию к уже полученным данным
    const skip = (page - 1) * pageSize;
    const paginatedShifts = employee.openedShifts
      ? employee.openedShifts.slice(skip, skip + pageSize)
      : [];
    
    // Формируем метаданные пагинации
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    // Преобразуем смены в DTO
    const items = plainToInstance(
      EmployeeShiftPreviewResponseDto, 
      paginatedShifts, 
      { excludeExtraneousValues: true }
    );
    
    return { items, pagination };
  }



}