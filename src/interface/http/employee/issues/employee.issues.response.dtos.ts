/**
 * Employee Issue Response DTOs
 *
 * Сотрудник видит только свои обращения (без from, fromUserType, fromTelegramId).
 * @see src/interface/http/shared/base-responses/issue.base-response
 */

import { PickType } from '@nestjs/swagger';
import { BaseIssueResponseDto } from 'src/interface/http/shared/base-responses';

export class IssueResponseDto extends PickType(BaseIssueResponseDto, [
  'issueId',
  'issueText',
  'status',
  'level',
  'category',
  'resolution',
  'resolvedAt',
  'createdAt',
] as const) {}
