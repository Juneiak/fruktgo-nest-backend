import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  EmployeePreviewResponseDto,
  EmployeeFullResponseDto
} from './employee.admin.response.dto';
import { UpdateEmployeeDto } from './employee.admin.request.dto';
import { plainToInstance } from 'class-transformer';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { LogsService } from 'src/common/modules/logs/logs.service';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { transformPaginatedResult } from 'src/common/utils';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';
import { EmployeeModel } from '../employee.schema';
import { BlockDto } from 'src/common/dtos/block.dto';
import { Types } from 'mongoose';
import { BlockStatus } from 'src/common/enums/common.enum';

@Injectable()
export class EmployeeAdminService {
  constructor(
    @InjectModel('Employee') private employeeModel: EmployeeModel,
    private readonly logsService: LogsService
  ) { }

  async getEmployees(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<EmployeePreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;

    const result = await this.employeeModel.paginate({}, {
      page,
      limit: pageSize,
      select: '+internalNote',
      populate: [
        { path: 'pinnedTo', select: 'shopId shopName' },
        { path: 'employer', select: 'sellerId companyName' },
      ],
      sort: { createdAt: -1 },
      lean: true,
      leanWithId: false,
    });
    return transformPaginatedResult(result, EmployeePreviewResponseDto);
  }

  async getEmployee(authedAdmin: AuthenticatedUser, employeeId: string): Promise<EmployeeFullResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findOne({ _id: employeeId }).select('+internalNote')
      .populate('pinnedTo', 'shopId shopName')
      .populate('employer', 'sellerId companyName')
      .lean({ virtuals: true })
      .exec();
    return plainToInstance(EmployeeFullResponseDto, employee, { excludeExtraneousValues: true });
  }

  async getEmployeeLogs(authedAdmin: AuthenticatedUser, employeeId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    return this.logsService.getAllEmployeeLogs(employeeId, paginationQuery);
  }


  async updateEmployee(
    authedAdmin: AuthenticatedUser,
    employeeId: string,
    dto: UpdateEmployeeDto
  ): Promise<EmployeeFullResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findById(employeeId);
    if (!employee) throw new NotFoundException(`Сотрудник с ID ${employeeId} не найден`);
    if (employee.blocked.status === BlockStatus.BLOCKED) throw new ForbiddenException('Сотрудник заблокирован');
    // Собираем изменения для лога
    const changes: string[] = [];


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
      await employee.save();
      const logText = `Администратор обновил данные сотрудника (${employee.employeeName}):\n${changes.join('\n')}`;
      await this.logsService.addEmployeeLog(employee._id.toString(), LogLevel.SERVICE, logText);
    }

    return this.getEmployee(authedAdmin, employeeId);
  }


  async blockEmployee(authedAdmin: AuthenticatedUser, employeeId: string, dto: BlockDto): Promise<EmployeeFullResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findById(new Types.ObjectId(employeeId)).exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');

    const changedFields: string[] = [];

    if (dto.status !== undefined) {
      employee.blocked.status = dto.status;
      changedFields.push(`статус блокировки: ${employee.blocked.status} -> ${dto.status}`);
    }
    if (dto.reason !== undefined) {
      employee.blocked.reason = dto.reason;
      changedFields.push(`причина блокировки: ${employee.blocked.reason} -> ${dto.reason}`);
    }
    if (dto.code !== undefined) {
      employee.blocked.code = dto.code;
      changedFields.push(`код блокировки: ${employee.blocked.code} -> ${dto.code}`);
    }
    if (dto.blockedUntil !== undefined) {
      employee.blocked.blockedUntil = dto.blockedUntil;
      changedFields.push(`срок блокировки: ${employee.blocked.blockedUntil} -> ${dto.blockedUntil}`);
    }
    employee.blocked = dto;
    await employee.save();

    const changes = `блокировка: ${changedFields.join(', ')}`;
    await this.logsService.addEmployeeLog(employeeId, LogLevel.SERVICE, `Админ ${authedAdmin.id} изменил статус блокировки сотрудника: ${changes}`);

    return this.getEmployee(authedAdmin, employeeId);
  }
}