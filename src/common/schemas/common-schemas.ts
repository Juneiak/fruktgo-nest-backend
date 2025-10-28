import { BlockStatus } from '../enums/common.enum';
import { Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { Platform } from 'src/modules/platform';

// ====================================================
// BLOCKED
// ====================================================
export const BlockedSchema = {
  _id: false,
  status: { type: String, enum: Object.values(BlockStatus), required: true, default: BlockStatus.ACTIVE },
  reason: { type: String },
  code: { type: String },
  by: { type: Types.ObjectId, ref: Platform.name },
  blockedAt: { type: Date },
  blockedUntil: { type: Date },
}
export interface Blocked {
  status: BlockStatus;
  reason?: string;
  code?: string;
  by?: Types.ObjectId;
  blockedAt?: Date;
  blockedUntil?: Date;
}

export const initBlocked: Blocked = {
  status: BlockStatus.ACTIVE
}


// ====================================================
// ADDRESS
// ====================================================
export const AddressSchema = {
  id: { type: String, default: () => randomUUID(), index: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  city: { type: String, required: true },
  street: { type: String, required: true },
  house: { type: String, required: true },
  apartment: { type: String },
  floor: { type: String },
  entrance: { type: String },
  intercomCode: { type: String },
};
export interface Address {
  id: string;
  latitude: number;
  longitude: number;
  city: string;
  street: string;
  house: string;
  apartment?: string;
  floor?: string;
  entrance?: string;
  intercomCode?: string;
};