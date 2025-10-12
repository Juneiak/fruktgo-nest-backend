import { Injectable } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { ShiftPort } from './shift.port';

@Injectable()
export class ShiftFacade implements ShiftPort {
  constructor(private readonly shiftService: ShiftService) {}

  // ====================================================
  // COMMANDS
  // ====================================================


  // ====================================================
  // QUERIES
  // ====================================================

}