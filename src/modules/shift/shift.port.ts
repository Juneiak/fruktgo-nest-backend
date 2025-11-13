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
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetShiftsQuery, GetShiftQuery } from './shift.queries';

export interface ShiftPort {

  // ====================================================
  // QUERIES
  // ==================================================== 
  getShifts(query: GetShiftsQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Shift>>;
  getShift(query: GetShiftQuery, queryOptions?: CommonQueryOptions): Promise<Shift | null>;
  getCurrentShiftOfShop(shopId: string, queryOptions?: CommonQueryOptions): Promise<Shift | null>;

  // ====================================================
  // COMMANDS
  // ==================================================== 
  openShift(command: OpenShiftCommand, commandOptions?: CommonCommandOptions): Promise<Shift>;
  closeShift(command: CloseShiftCommand, commandOptions?: CommonCommandOptions): Promise<Shift>;
  startClosing(command: StartClosingShiftCommand, commandOptions?: CommonCommandOptions): Promise<Shift>;
  pauseShift(command: PauseShiftCommand, commandOptions?: CommonCommandOptions): Promise<Shift>;
  resumeShift(command: ResumeShiftCommand, commandOptions?: CommonCommandOptions): Promise<Shift>;
  forceCloseShift(command: ForceCloseShiftCommand, commandOptions?: CommonCommandOptions): Promise<Shift>;
  abandonShift(command: AbandonShiftCommand, commandOptions?: CommonCommandOptions): Promise<Shift>;
  updateStatistics(command: UpdateStatisticsCommand, commandOptions?: CommonCommandOptions): Promise<Shift>;
}

export const SHIFT_PORT = Symbol('SHIFT_PORT');