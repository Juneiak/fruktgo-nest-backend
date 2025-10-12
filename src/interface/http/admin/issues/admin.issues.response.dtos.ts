import { IssueStatus, IssueUserType, IssueLevel } from 'src/modules/issue/issue.schema';
import { Expose, Type } from 'class-transformer';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class CreatedIssueResponseDto {
  @Expose() status?: IssueStatus;
  @Expose() issueText?: string;
  @Expose() issueId: string;
  @ExposeObjectId() from: string;
  @Expose() level: IssueLevel;
  @Expose() fromTelegramId: number;
  @Expose() fromUserType: IssueUserType;
}

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

export class IssueFullResponseDto {
  @Expose() createdAt: Date;
  @Expose() status?: IssueStatus;
  @Expose() issueText?: string;
  @Expose() result?: string | null;
  @Expose() issueId: string;
  @Expose() @Type(() => FromContactDto) from: FromContactDto;
  @Expose() level: IssueLevel;
  @Expose() fromTelegramId: number;
  @Expose() fromUserType: IssueUserType;
}

export class IssuePreviewResponseDto {
  @Expose() createdAt: Date;
  @Expose() status?: IssueStatus;
  @Expose() issueId: string;
  @ExposeObjectId() from: string;
  @Expose() issueText: string;
  @Expose() level: IssueLevel;
  @Expose() fromTelegramId: number;
  @Expose() fromUserType: IssueUserType;
}