import { Shift } from './shift.schema';
import { PaginateResult } from 'mongoose';
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
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetShiftsQuery } from './shift.queries';

export interface ShiftPort {

  // ====================================================
  // COMMANDS
  // ==================================================== 
  openShift(command: OpenShiftCommand, options: CommonCommandOptions): Promise<Shift>;
  closeShift(command: CloseShiftCommand, options: CommonCommandOptions): Promise<Shift>;
  startClosing(command: StartClosingShiftCommand, options: CommonCommandOptions): Promise<Shift>;
  pauseShift(command: PauseShiftCommand, options: CommonCommandOptions): Promise<Shift>;
  resumeShift(command: ResumeShiftCommand, options: CommonCommandOptions): Promise<Shift>;
  forceCloseShift(command: ForceCloseShiftCommand, options: CommonCommandOptions): Promise<Shift>;
  abandonShift(command: AbandonShiftCommand, options: CommonCommandOptions): Promise<Shift>;
  updateStatistics(command: UpdateStatisticsCommand, options: CommonCommandOptions): Promise<Shift>;

  // ====================================================
  // QUERIES
  // ==================================================== 
  getShifts(query: GetShiftsQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Shift>>;
  getShift(shiftId: string, options: CommonQueryOptions): Promise<Shift | null>;
  getCurrentShiftOfShop(shopId: string, options: CommonQueryOptions): Promise<Shift | null>;
}

export const SHIFT_PORT = Symbol('SHIFT_PORT');