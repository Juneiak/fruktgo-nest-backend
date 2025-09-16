import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { checkId, transformPaginatedResult } from "src/common/utils";
import { LogsService } from 'src/common/modules/logs/logs.service';
import {AuthenticatedUser} from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.response.dto';
import  {ShiftResponseDto  } from './shift.admin.response.dtos';
import { ShiftFilterQuery } from './shift.admin.filter.dtos';
import { ShiftService } from '../../shift.service';
import { ShiftFilterBuilder } from '../../shift.types';
import { ActorType } from '../../shift.schema';


@Injectable()
export class ShiftAdminService {
  constructor(
    private readonly logsService: LogsService,
    private readonly shiftService: ShiftService
  ) {}


  async getShifts(
    authedAdmin: AuthenticatedUser,
    shiftFilterQuery: ShiftFilterQuery,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ShiftResponseDto>> {
    const filter = ShiftFilterBuilder.from(shiftFilterQuery);
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