/**
 * Common Utils
 *
 * Утилиты для работы с ответами.
 */

import { PaginateResult } from 'mongoose';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { PaginatedResponseDto } from './shared.response.dtos';

/**
 * Преобразует результат пагинации mongoose-paginate-v2 в структуру для TanStack Table
 * @param result - Результат пагинации из mongoose-paginate-v2
 * @param dtoClass - Класс DTO для трансформации элементов
 * @returns Полная структура пагинации с навигацией и метаданными для UI
 */
export const transformPaginatedResult = <T, D>(
  result: PaginateResult<T>,
  dtoClass: ClassConstructor<D>,
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
    },
  };
};
