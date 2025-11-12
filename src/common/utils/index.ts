import { PaginateResult, Types, ClientSession } from 'mongoose';
import { ForbiddenException } from '@nestjs/common';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { BlockStatus } from 'src/common/enums/common.enum';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { Blocked } from 'src/common/schemas/common-schemas';
import { DomainError, DomainErrorCode } from 'src/common/errors';
import { PaginatedResponseDto } from 'src/common/dtos';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Опции для функции assignField
 */
export interface AssignFieldOptions {
  /**
   * Как обрабатывать null значения (default: 'delete')
   * - 'delete': удаляет поле из документа (устанавливает undefined)
   * - 'keep': сохраняет null в документе
   * - 'skip': пропускает (не изменяет поле)
   */
  onNull?: 'delete' | 'keep' | 'skip';
}

/**
 * Проверяет, может ли поле быть undefined
 */
type CanBeUndefined<T, K extends keyof T> = undefined extends T[K] ? true : false;

/**
 * Проверяет, может ли поле быть null
 */
type CanBeNull<T, K extends keyof T> = null extends T[K] ? true : false;

/**
 * Умная типизация опций в зависимости от типа поля:
 * - Если поле может быть undefined → все опции доступны
 * - Если поле может быть null (но не undefined) → только 'keep' | 'skip'
 * - Если поле обязательное (не null и не undefined) → только 'skip'
 */
type SmartAssignFieldOptions<T, K extends keyof T> = 
  CanBeUndefined<T, K> extends true
    ? AssignFieldOptions // Поле может быть undefined - все опции доступны
    : CanBeNull<T, K> extends true
      ? { onNull?: 'keep' | 'skip' } // Поле может быть null, но не undefined - только keep/skip
      : { onNull?: 'skip' }; // Обязательное поле - только skip

/**
 * Присваивает значение полю документа с умной обработкой null/undefined
 * TypeScript автоматически ограничивает доступные опции в зависимости от типа поля:
 * 
 * - Если value === undefined, ничего не делает (всегда пропускает)
 * - Если value === null, поведение зависит от опции onNull:
 *   - 'delete' (default): удаляет поле из документа (устанавливает undefined)
 *   - 'keep': сохраняет null в документе
 *   - 'skip': пропускает (не изменяет поле)
 * - Иначе устанавливает значение
 * 
 * @param target - Целевой объект
 * @param field - Поле для изменения
 * @param value - Новое значение
 * @param options - Опции присваивания (TypeScript ограничивает доступные опции)
 * 
 * @example
 * // Обязательное поле (required: true) - только skip
 * assignField(seller, 'companyName', payload.companyName, { onNull: 'skip' }); // ✅ OK
 * assignField(seller, 'companyName', payload.companyName, { onNull: 'delete' }); // ❌ TS Error
 * 
 * // Nullable поле (string | null) - keep или skip
 * assignField(customer, 'selectedAddressId', payload.id, { onNull: 'keep' }); // ✅ OK
 * assignField(customer, 'selectedAddressId', payload.id, { onNull: 'delete' }); // ❌ TS Error
 * 
 * // Опциональное поле (string?) - все опции
 * assignField(seller, 'internalNote', payload.note, { onNull: 'delete' }); // ✅ OK
 * assignField(seller, 'internalNote', payload.note, { onNull: 'keep' }); // ✅ OK
 * assignField(seller, 'internalNote', payload.note, { onNull: 'skip' }); // ✅ OK
 */
export function assignField<T, K extends keyof T>(
  target: T,
  field: K,
  value: T[K] | null | undefined,
  options?: SmartAssignFieldOptions<T, K>
): void {
  // undefined всегда пропускаем
  if (value === undefined) return;
  
  // Обработка null
  if (value === null) {
    const onNull = options?.onNull ?? 'delete';
    
    switch (onNull) {
      case 'skip':
        return; // не изменяем поле
      case 'keep':
        (target[field] as any) = null; // сохраняем null
        break;
      case 'delete':
        (target[field] as any) = undefined; // удаляем поле
        break;
    }
    return;
  }
  
  // Обычное значение
  target[field] = value;
}

//TODO: довести до ума, пока просто отключу
export function verifyUserStatus<T extends { blocked?: Blocked; verifiedStatus?: VerifiedStatus }>(
  user: T,
  allowedStatuses: VerifiedStatus[] = [VerifiedStatus.VERIFIED],
): void {
  if (user.blocked?.status === BlockStatus.BLOCKED) throw new ForbiddenException('Пользователь заблокирован');
  if (user.verifiedStatus && !allowedStatuses.includes(user.verifiedStatus)) throw new ForbiddenException('Пользователь не верифицирован');
}

export function checkId(ids: readonly (string | null | undefined)[]): void {
  for (const id of ids) {
    if (!id) continue;
    if (!Types.ObjectId.isValid(id)) throw new DomainError({ code: DomainErrorCode.VALIDATION, message: `${id} невалидный` })
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


/**
 * Преобразует результат пагинации mongoose-paginate-v2 в структуру для TanStack Table
 * @param result - Результат пагинации из mongoose-paginate-v2
 * @param dtoClass - Класс DTO для трансформации элементов
 * @returns Полная структура пагинации с навигацией и метаданными для UI
 */
export const transformPaginatedResult = <T, D>(
  result: PaginateResult<T>,
  dtoClass: ClassConstructor<D>
): PaginatedResponseDto<D> => {
  const currentPage = result.page || 1;
  const pageSize = result.limit || 10;
  const totalItems = result.totalDocs;
  const itemsOnPage = result.docs.length;
  
  // Вычисляем индексы для отображения в UI (например, "Showing 1-10 of 100")
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = totalItems === 0 ? 0 : startIndex + itemsOnPage - 1;

  return {
    items: plainToInstance(dtoClass, result.docs, {
      excludeExtraneousValues: true,
    }),
    pagination: {
      // Базовая информация о пагинации
      currentPage,
      pageSize,
      totalItems,
      totalPages: result.totalPages,
      
      // Навигация для TanStack Table
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      nextPage: result.nextPage ?? null,
      prevPage: result.prevPage ?? null,
      
      // Вычисляемые поля для UI
      startIndex,
      endIndex,
      itemsOnPage,
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


export const parcePhoneNumber = (phoneNumber: string) => parsePhoneNumberFromString(phoneNumber, 'RU');