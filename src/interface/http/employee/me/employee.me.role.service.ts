import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { EmployeeResponseDto } from './employee.me.response.dtos';
// import { UpdateEmployeeDto } from './employee.me.request.dtos';
import { AuthenticatedUser } from 'src/common/types';
import {
  EmployeePort,
  EMPLOYEE_PORT,
  // EmployeeCommands,
  EmployeeQueries
} from 'src/modules/employee';
// import {
//   LogsCommands,
//   LogsEvents,
//   LogsEnums
// } from 'src/infra/logs';
// import { UserType } from 'src/common/enums/common.enum';
// import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EmployeeMeRoleService {
  constructor(
    @Inject(EMPLOYEE_PORT) private readonly employeePort: EmployeePort,
    // private readonly eventEmitter: EventEmitter2,
  ) {}

  async getEmployee(authedEmployee: AuthenticatedUser): Promise<EmployeeResponseDto> {
    const query = new EmployeeQueries.GetEmployeeQuery({ employeeId: authedEmployee.id });
    const employee = await this.employeePort.getEmployee(query);
    if (!employee) throw new NotFoundException('Сотрудник не найден');

    return plainToInstance(EmployeeResponseDto, employee, { excludeExtraneousValues: true });
  }

  // TODO: Требует расширения доменной команды UpdateEmployeeCommand
  // Текущая команда поддерживает только админские поля (verifiedStatus, internalNote, position, salary, sellerNote, status)
  // Нужно добавить поддержку персональных полей (employeeName, sex, birthDate)
  // async updateEmployee(
  //   authedEmployee: AuthenticatedUser,
  //   dto: UpdateEmployeeDto
  // ): Promise<EmployeeResponseDto> {
  //   const command = new EmployeeCommands.UpdateEmployeeCommand(
  //     authedEmployee.id,
  //     {
  //       employeeName: dto.employeeName,
  //       sex: dto.sex,
  //       birthDate: dto.birthDate,
  //     }
  //   );

  //   await this.employeePort.updateEmployee(command);

  //   // Логируем обновление профиля
  //   this.eventEmitter.emit(
  //     LogsEvents.LOG_EVENTS.CREATED,
  //     new LogsCommands.CreateLogCommand({
  //       entityType: LogsEnums.LogEntityType.EMPLOYEE,
  //       entityId: authedEmployee.id,
  //       text: 'Сотрудник обновил свои данные',
  //       logLevel: LogsEnums.LogLevel.LOW,
  //       forRoles: [UserType.ADMIN],
  //     })
  //   );

  //   return this.getEmployee(authedEmployee);
  // }
}