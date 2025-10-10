import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  EmployeePreviewResponseDto,
  EmployeeFullResponseDto
} from './admin.employees.response.dtos';
import { UpdateEmployeeDto } from './admin.employees.request.dtos';
import { plainToInstance } from 'class-transformer';
import { LogsService } from 'src/infra/log/application/log.service';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { UserType } from "src/common/enums/common.enum";
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { transformPaginatedResult } from 'src/common/utils';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dtos';
import { EmployeeModel } from 'src/modules/employee/employee.schema';
import { BlockDto } from 'src/interface/http/common/common.request.dtos';
import { Types } from 'mongoose';

@Injectable()
export class AdminEmployeesRoleService {
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
    const employee = await this.employeeModel.findOne({ _id: employeeId })
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
    if (changes.length > 0 && employee.isModified()) {
      await employee.save();
      await this.logsService.addEmployeeLog(
        employee._id.toString(), 
        `Администратор обновил данные сотрудника (${employee.employeeName}):\n${changes.join('\n')}`, 
        {
          forRoles: [UserType.ADMIN],
          session: undefined
        }
      );
    } 
    return this.getEmployee(authedAdmin, employeeId);
  }


  async blockEmployee(authedAdmin: AuthenticatedUser, employeeId: string, dto: BlockDto): Promise<EmployeeFullResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findById(new Types.ObjectId(employeeId)).exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');

    const changes: string[] = [];

    if (dto.status !== undefined) {
      employee.blocked.status = dto.status;
      changes.push(`статус блокировки: ${employee.blocked.status} -> ${dto.status}`);
    }
    if (dto.reason !== undefined) {
      employee.blocked.reason = dto.reason;
      changes.push(`причина блокировки: ${employee.blocked.reason} -> ${dto.reason}`);
    }
    if (dto.code !== undefined) {
      employee.blocked.code = dto.code;
      changes.push(`код блокировки: ${employee.blocked.code} -> ${dto.code}`);
    }
    if (dto.blockedUntil !== undefined) {
      employee.blocked.blockedUntil = dto.blockedUntil;
      changes.push(`срок блокировки: ${employee.blocked.blockedUntil} -> ${dto.blockedUntil}`);
    }
    if (changes.length > 0 && employee.isModified()) {
      await employee.save();
      await this.logsService.addEmployeeLog(
        employeeId,
        `Админ ${authedAdmin.id} изменил статус блокировки сотрудника: ${changes.join(', ')}`,
        { forRoles: [UserType.ADMIN], session: undefined }
      );
    }

    return this.getEmployee(authedAdmin, employeeId);
  }
}