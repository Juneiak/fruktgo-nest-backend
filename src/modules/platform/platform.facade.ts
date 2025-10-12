import { Injectable } from '@nestjs/common';
import { PlatformService } from './platform.service';

@Injectable()
export class PlatformFacade {
  constructor(private readonly platformService: PlatformService) {}

  // ====================================================
  // COMMANDS
  // ====================================================


  // ====================================================
  // QUERIES
  // ====================================================

}