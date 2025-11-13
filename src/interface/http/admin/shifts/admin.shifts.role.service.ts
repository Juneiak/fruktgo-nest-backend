import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { checkId } from "src/common/utils";
import { AuthenticatedUser } from 'src/common/types';
import { ShiftResponseDto } from './admin.shifts.response.dtos';
import { ShiftsQueryDto } from './admin.shifts.query.dtos';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { UserType } from 'src/common/enums/common.enum';
import {
  ShiftPort,
  SHIFT_PORT,
  ShiftQueries,
  ShiftCommands,
  ShiftEnums
} from 'src/modules/shift';
import { LogsQueries, LogsEnums, LOGS_PORT, LogsPort } from 'src/infra/logs';
import {
  PaginatedResponseDto,
  LogResponseDto,
  transformPaginatedResult,
  PaginationQueryDto
} from 'src/interface/http/common';

@Injectable()
export class AdminShiftsRoleService {
  constructor(
    @Inject(SHIFT_PORT) private readonly shiftPort: ShiftPort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
  ) {}



  async getShifts(
    authedAdmin: AuthenticatedUser,
    shiftsQueryDto: ShiftsQueryDto,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ShiftResponseDto>> {

    const query = new ShiftQueries.GetShiftsQuery({
      shopId: shiftsQueryDto.shopId,
      actorId: shiftsQueryDto.employeeId,
      actorType: shiftsQueryDto.employeeId ? ShiftEnums.ActorType.EMPLOYEE : undefined,
      startDate: shiftsQueryDto.startDate,
      endDate: shiftsQueryDto.endDate,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.shiftPort.getShifts(query, queryOptions);
    return transformPaginatedResult(result, ShiftResponseDto);

  }


  async getShift(
    authedAdmin: AuthenticatedUser,
    shiftId: string
  ): Promise<ShiftResponseDto> {

    const query = new ShiftQueries.GetShiftQuery(shiftId);
    const shift = await this.shiftPort.getShift(query);
    if (!shift) throw new NotFoundException('Смена не найдена');

    return plainToInstance(ShiftResponseDto, shift, { excludeExtraneousValues: true });

  }


  async forceCloseShift(
    authedAdmin: AuthenticatedUser,
    shiftId: string
  ): Promise<ShiftResponseDto> {

    const command = new ShiftCommands.ForceCloseShiftCommand(shiftId, {
      actor: {
        actorType: ShiftEnums.ActorType.ADMIN,
        actorId: new Types.ObjectId(authedAdmin.id),
        actorName: authedAdmin.id
      },
      comment: 'force close by admin'
    });

    await this.shiftPort.forceCloseShift(command);
    return this.getShift(authedAdmin, shiftId);

  }


  async getShiftLogs(
    authedAdmin: AuthenticatedUser,
    shiftId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {

    const query = new LogsQueries.GetEntityLogsQuery(
      LogsEnums.LogEntityType.SHIFT,
      shiftId,
      [UserType.ADMIN]
    );
    
    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };
    
    const result = await this.logsPort.getEntityLogs(query, queryOptions);
    return transformPaginatedResult(result, LogResponseDto);

  }
}