/**
 * Admin Issue Response DTOs
 *
 * Используем PickType от BaseIssueResponseDto для выбора полей.
 * @see src/interface/http/shared/base-responses/issue.base-response
 */

import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { BaseIssueResponseDto } from 'src/interface/http/shared/base-responses';

/**
 * Created — после создания issue
 */
export class CreatedIssueResponseDto extends PickType(BaseIssueResponseDto, [
  'issueId',
  'from',
  'fromUserType',
  'fromTelegramId',
  'issueText',
  'status',
  'level',
] as const) {}

/**
 * Preview — для списков
 */
export class IssuePreviewResponseDto extends PickType(BaseIssueResponseDto, [
  'issueId',
  'from',
  'fromUserType',
  'fromTelegramId',
  'issueText',
  'status',
  'level',
  'category',
  'resolution',
  'createdAt',
] as const) {}

/**
 * Full — с populated from (контактные данные)
 * from переопределён на FromContactDto
 */
class FromContactDto {
  @Expose() id: string;
  @Expose() telegramId: number;
  @Expose() phone: string;
  @Expose() email: string;
  @Expose() telegramUsername: string;
  @Expose() telegramFirstName: string;
  @Expose() telegramLastName: string;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
}

class _IssueFullBase extends PickType(BaseIssueResponseDto, [
  'issueId',
  'fromUserType',
  'fromTelegramId',
  'issueText',
  'status',
  'level',
  'category',
  'resolution',
  'resolvedAt',
  'createdAt',
] as const) {}

export class IssueFullResponseDto extends _IssueFullBase {
  @Expose() @Type(() => FromContactDto) from: FromContactDto;
}