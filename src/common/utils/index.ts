import { Model, Types } from 'mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { VerifiedStatus } from 'src/common/types';
import * as crypto from 'crypto';

export function checkIsBlocked<T extends { isBlocked?: boolean }>(user: T): void {
  // if (user.isBlocked) throw new ForbiddenException('Пользователь заблокирован');
}

export function checkVerifiedStatus<T extends { verifiedStatus?: VerifiedStatus }>(
  user: T,
  allowedStatuses: VerifiedStatus[] = [VerifiedStatus.VERIFIED], 
): void {
  if (!user.verifiedStatus || !allowedStatuses.includes(user.verifiedStatus)) {
    // throw new ForbiddenException('Пользователь не верифицирован');
  }
}

//TODO: довести до ума, пока просто отключу
export function verifyUserStatus<T extends { isBlocked?: boolean; verifiedStatus?: VerifiedStatus }>(
  user: T,
  allowedStatuses: VerifiedStatus[] = [VerifiedStatus.VERIFIED],
): void {
  
  checkIsBlocked(user);
  checkVerifiedStatus(user, allowedStatuses);
}

export function checkId(ids: string[]): void {
  for (const id of ids) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`${id} невалидный`)
  }
}

/**
 * Преобразует значение из form-data в число
 */
export function transformDtoToFormDataNumber({ value }) {
  if (value === undefined || value === null || value === '') return undefined;
  return typeof value === 'string' ? parseFloat(value) : Number(value);
}

/**
 * Преобразует значение из form-data в строку
 */
export function transformDtoToFormDataString({ value }) {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

/**
 * Преобразует значение из form-data в массив
 */
export function transformDtoToFormDataArray({ value }) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      // Если это просто строка, а не JSON, то вернём массив с этой строкой
      return [value];
    }
  }
  return Array.isArray(value) ? value : [value];
}


export function generateAuthCode(): string {
  // 4 случайные цифры с ведущими нулями
  return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}