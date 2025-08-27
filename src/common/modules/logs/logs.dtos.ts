import { Expose, Type} from "class-transformer";
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { PaginationMetaDto } from "src/common/dtos";

export class LogDto {
  @Expose()
  id: string;

  @Expose()
  createdAt: Date;

  @Expose()
  logLevel: LogLevel;

  @Expose()
  text: string;
}

export class PaginatedLogDto {
  @Expose()
  @Type(() => LogDto)
  items: LogDto[];

  @Expose()
  pagination: PaginationMetaDto;
}