/**
 * Common Response DTOs
 *
 * Общие DTOs используемые во всех ролях.
 */

import { Expose, Type } from 'class-transformer';
import { UserType, BlockStatus } from 'src/common/enums/common.enum';
import { LogsEnums } from 'src/infra/logs';

// ═══════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════

export class PaginationMetaDto {
  @Expose() currentPage: number;
  @Expose() pageSize: number;
  @Expose() totalItems: number;
  @Expose() totalPages: number;

  @Expose() hasNextPage: boolean;
  @Expose() hasPrevPage: boolean;
  @Expose() nextPage: number | null;
  @Expose() prevPage: number | null;

  @Expose() startIndex: number;
  @Expose() endIndex: number;
  @Expose() itemsOnPage: number;
}

export class PaginatedResponseDto<T> {
  @Expose() items: T[];
  @Expose() @Type(() => PaginationMetaDto) pagination: PaginationMetaDto;
}

// ═══════════════════════════════════════════════════════════════
// SIMPLE RESPONSES
// ═══════════════════════════════════════════════════════════════

export class MessageResponseDto {
  @Expose() message: string;
}

// ═══════════════════════════════════════════════════════════════
// EMBEDDED SCHEMAS
// ═══════════════════════════════════════════════════════════════

export class BlockedResponseDto {
  @Expose() status: BlockStatus;
  @Expose() reason?: string | null;
  @Expose() code?: string | null;
  @Expose() by?: string | null;
  @Expose() blockedAt?: Date | null;
  @Expose() blockedUntil?: Date | null;
}

export class AddressResponseDto {
  @Expose() id: string;
  @Expose() city: string;
  @Expose() street: string;
  @Expose() house?: string;
  @Expose() entrance?: string;
  @Expose() floor?: string;
  @Expose() apartment?: string;
  @Expose() intercomCode?: string;
  @Expose() address: string;
  @Expose() latitude?: number;
  @Expose() longitude?: number;
}

export class LogResponseDto {
  @Expose() id: string;
  @Expose() createdAt: Date;
  @Expose() logLevel: LogsEnums.LogLevel;
  @Expose() text: string;
  @Expose() forRoles: UserType[];
}
