import { BlockStatus } from '../enums/common.enum';
import { Types } from 'mongoose';


// ====================================================
// BLOCKED
// ====================================================
export const BlockedSchema = {
  status: { type: String, enum: Object.values(BlockStatus), required: true, default: BlockStatus.ACTIVE },
  reason: { type: String, default: null },          // свободный текст
  code: { type: String, default: null },          // машинно-читабельный код причины (опц.)
  by: { type: Types.ObjectId, ref: 'Admin', default: null }, // кто установил (опц.)
  blockedAt: { type: Date, default: null },
  blockedUntil: { type: Date, default: null },       // для SUSPENDED
  _id: false,
}
export interface Blocked {
  status: BlockStatus;
  reason?: string | null;
  code?: string | null;
  by?: Types.ObjectId | null;
  blockedAt?: Date | null;
  blockedUntil?: Date | null;
  _id: Types.ObjectId;
}


// ====================================================
// ADDRESS
// ====================================================
export const AddressSchema = {
  address: { type: String, required: true },
  apartment: { type: String, required: true, default: null },
  entrance: { type: String, required: true, default: null },
  floor: { type: String, required: true, default: null },
  intercomCode: { type: String, default: null },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
};
export interface Address {
  city: string;
  street: string;
  house: string | null;         // Квартира или офис
  entrance: string | null;          // Подъезд
  floor: string | null;             // Этаж
  apartment: string | null;
  intercomCode: string | null;   
  latitude?: number | null;
  longitude?: number | null;
  _id: Types.ObjectId;
};