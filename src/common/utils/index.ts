import { PaginateResult, Types, ClientSession } from 'mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { VerifiedStatus } from 'src/common/types';
import { BlockStatus } from 'src/common/enums/common.enum';
import { PaginatedResponseDto } from '../dtos';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { Blocked } from '../schemas/common-schemas';


//TODO: довести до ума, пока просто отключу
export function verifyUserStatus<T extends { blocked?: Blocked; verifiedStatus?: VerifiedStatus }>(
  user: T,
  allowedStatuses: VerifiedStatus[] = [VerifiedStatus.VERIFIED],
): void {
  if (user.blocked?.status === BlockStatus.BLOCKED) throw new ForbiddenException('Пользователь заблокирован');
  if (user.verifiedStatus && !allowedStatuses.includes(user.verifiedStatus)) throw new ForbiddenException('Пользователь не верифицирован');
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


export const transformPaginatedResult = <T, D>(
  result: PaginateResult<T>,
  dtoClass: ClassConstructor<D>
): PaginatedResponseDto<D> => {
  return {
    items: plainToInstance(dtoClass, result.docs, {
      excludeExtraneousValues: true,
    }),
    pagination: {
      totalItems: result.totalDocs,
      totalPages: result.totalPages,
      currentPage: result.page || 1,
      pageSize: result.limit || 10,
    }
  }
};

/**
 * Утилита для проверки существования сущности с учетом статуса блокировки и верификации
 * @param model - Модель Mongoose для поиска
 * @param filter - Базовый фильтр поиска
 * @param options - Опции проверки
 * @returns Promise<boolean> - true если сущность найдена и соответствует критериям
 */
export async function checkEntityStatus(
  model: any,
  filter: any,
  options: {
    checkVerification?: boolean;
    checkBlocked?: boolean;
    allowedVerificationStatuses?: VerifiedStatus[];
    allowedBlockStatuses?: BlockStatus[];
    session?: ClientSession
  } = {},
): Promise<boolean> {
  const {
    checkVerification = true,
    checkBlocked = true,
    allowedVerificationStatuses = [VerifiedStatus.VERIFIED],
    allowedBlockStatuses = [BlockStatus.ACTIVE],
    session
  } = options;

  // Создаем итоговый фильтр
  const finalFilter: any = { ...filter };

  // Добавляем проверку верификации
  if (checkVerification) {
    finalFilter.verifiedStatus = { $in: allowedVerificationStatuses };
  }

  // Добавляем проверку блокировки
  if (checkBlocked) {
    finalFilter['blocked.status'] = { $in: allowedBlockStatuses };
  }

  // Проверяем существование
  const query = model.exists(finalFilter);
  if (session) query.session(session);
  const entity = await query.exec();
  return !!entity;
}