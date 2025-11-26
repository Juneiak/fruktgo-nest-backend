/**
 * Issue Response Schema & Base DTO
 *
 * Базовый интерфейс привязан к DB Schema.
 * Базовый DTO содержит все поля с декораторами.
 * Роль-специфичные DTOs делают PickType(BaseIssueResponseDto, [...])
 */

import { Expose } from 'class-transformer';
import { Issue } from 'src/modules/issue/issue.schema';
import { IssueStatus, IssueUserType, IssueLevel, IssueCategory } from 'src/modules/issue/issue.enums';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

// ═══════════════════════════════════════════════════════════════
// INTERFACES (type-safe привязка к схеме)
// ═══════════════════════════════════════════════════════════════

export interface IIssueResponse {
  issueId: string;
  fromUserType: Issue['fromUserType'];
  fromTelegramId: Issue['fromTelegramId'];
  from: string;
  issueText: Issue['issueText'];
  status: Issue['status'];
  level: Issue['level'];
  category?: Issue['category'];
  resolution: Issue['resolution'];
  resolvedAt: Issue['resolvedAt'];
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// BASE DTOs (с декораторами, для наследования)
// ═══════════════════════════════════════════════════════════════

export class BaseIssueResponseDto implements IIssueResponse {
  @Expose() issueId: string;
  @Expose() fromUserType: IssueUserType;
  @Expose() fromTelegramId: number;
  @ExposeObjectId() from: string;
  @Expose() issueText: string;
  @Expose() status: IssueStatus;
  @Expose() level: IssueLevel;
  @Expose() category?: IssueCategory | null;
  @Expose() resolution: string | null;
  @Expose() resolvedAt: Date | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
