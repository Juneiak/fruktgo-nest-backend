import { Injectable } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { ShiftPort } from './shift.port';
import {
  OpenShiftCommand,
  CloseShiftCommand,
  StartClosingShiftCommand,
  PauseShiftCommand,
  ResumeShiftCommand,
  ForceCloseShiftCommand,
  AbandonShiftCommand,
  UpdateStatisticsCommand
} from './shift.commands';
import { Shift } from './shift.schema';
import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetShiftsQuery } from './shift.queries';

@Injectable()
export class ShiftFacade implements ShiftPort {
  constructor(private readonly shiftService: ShiftService) {}

  // ====================================================
  // COMMANDS
  // ====================================================
  async openShift(command: OpenShiftCommand, options: CommonCommandOptions): Promise<Shift> {
    return this.shiftService.openShift(command, options);
  }

  async closeShift(command: CloseShiftCommand, options: CommonCommandOptions): Promise<Shift> {
    return this.shiftService.closeShift(command, options);
  }

  async startClosing(command: StartClosingShiftCommand, options: CommonCommandOptions): Promise<Shift> {
    return this.shiftService.startClosing(command, options);
  }

  async pauseShift(command: PauseShiftCommand, options: CommonCommandOptions): Promise<Shift> {
    return this.shiftService.pauseShift(command, options);
  }

  async resumeShift(command: ResumeShiftCommand, options: CommonCommandOptions): Promise<Shift> {
    return this.shiftService.resumeShift(command, options);
  }

  async forceCloseShift(command: ForceCloseShiftCommand, options: CommonCommandOptions): Promise<Shift> {
    return this.shiftService.forceCloseShift(command, options);
  }

  async abandonShift(command: AbandonShiftCommand, options: CommonCommandOptions): Promise<Shift> {
    return this.shiftService.abandonShift(command, options);
  }

  async updateStatistics(command: UpdateStatisticsCommand, options: CommonCommandOptions): Promise<Shift> {
    return this.shiftService.updateStatistics(command, options);
  }

  // ====================================================
  // QUERIES
  // ====================================================
  async getShifts(query: GetShiftsQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Shift>> {
    return this.shiftService.getShifts(query, options);
  }

  async getShift(shiftId: string, options: CommonQueryOptions): Promise<Shift | null> {
    return this.shiftService.getShift(shiftId, options);
  }

  async getCurrentShiftOfShop(shopId: string, options: CommonQueryOptions): Promise<Shift | null> {
    return this.shiftService.getCurrentShiftOfShop(shopId, options);
  }
}