import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { checkId, transformPaginatedResult } from "src/common/utils";
import { LogsService } from 'src/infra/logs/application/log.service';
import {AuthenticatedUser} from 'src/common/types';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dtos';
import  {ShiftResponseDto  } from './admin.shifts.response.dtos';
import { ShiftsQueryDto } from './admin.shifts.query.dtos';
import { ShiftService } from 'src/modules/shift/shift.service';
import { ShiftFilterBuilder } from 'src/modules/shift/shift.types';
import { ActorType } from 'src/modules/shift/shift.schema';


@Injectable()
export class AdminShiftsRoleService {
  constructor(
    private readonly logsService: LogsService,
    private readonly shiftService: ShiftService
  ) {}


  async getShifts(
    authedAdmin: AuthenticatedUser,
    shiftsQueryDto: ShiftsQueryDto,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ShiftResponseDto>> {
    const filter = ShiftFilterBuilder.from(shiftsQueryDto);
    const result = await this.shiftService.getShifts(filter, paginationQuery);
    return transformPaginatedResult(result, ShiftResponseDto);
  }

  async getShift(authedAdmin: AuthenticatedUser, shiftId: string): Promise<ShiftResponseDto> {
    const shift = await this.shiftService.getShift(shiftId);
    return plainToInstance(ShiftResponseDto, shift, { excludeExtraneousValues: true });
  }

  
  async forceCloseShift(authedAdmin: AuthenticatedUser, shiftId: string): Promise<ShiftResponseDto> {
    await this.shiftService.forceClose(shiftId, { actorType: ActorType.ADMIN, actorId: new Types.ObjectId(authedAdmin.id), actorName: authedAdmin.id }, 'force close');
    return this.getShift(authedAdmin, shiftId);
  }


  async getShiftLogs(
    authedAdmin: AuthenticatedUser,
    shiftId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    checkId([shiftId]);
    return this.logsService.getAllShiftLogs(shiftId, paginationQuery);
  }


}