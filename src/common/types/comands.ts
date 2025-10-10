import { ClientSession } from "mongoose";
import { BlockStatus } from "src/common/enums/common.enum";

export interface CommonCommandOptions {
  session?: ClientSession;
}


export type BlockPayload = {
  status?: BlockStatus,
  reason?: string | null,
  code?: string | null,
  by?: string | null,
  blockedAt?: Date | null,
  blockedUntil?: Date | null
}