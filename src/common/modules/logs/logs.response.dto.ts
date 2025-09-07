import { Expose, Type} from "class-transformer";
import { LogLevel } from "src/common/modules/logs/logs.schema";
import { PaginationMetaDto } from "src/common/dtos";
import { UserType } from "src/common/types";

export class LogResponseDto {
  @Expose() id: string;
  @Expose() createdAt: Date;
  @Expose() logLevel: LogLevel;
  @Expose() text: string;
  @Expose() forRoles: UserType[];
}

// Алиас для обратной совместимости
export class LogDto extends LogResponseDto {}

export class PaginatedLogResponseDto {
  @Expose() @Type(() => LogResponseDto) items: LogResponseDto[];
  @Expose() @Type(() => PaginationMetaDto) pagination: PaginationMetaDto;
}

// Алиас для обратной совместимости
export class PaginatedLogDto extends PaginatedLogResponseDto {
  @Expose() @Type(() => LogDto) items: LogDto[];
}
