import { Expose, Type } from "class-transformer";
import { UserType } from "src/common/enums/common.enum";
import { LogLevel } from "src/infra/logs/infrastructure/log.schema";


export class PaginationMetaDto {
  @Expose() currentPage: number;
  @Expose() pageSize: number;
  @Expose() totalItems: number;
  @Expose() totalPages: number;
}


export class PaginatedResponseDto<T> {
  @Expose() items: T[];
  @Expose() @Type(() => PaginationMetaDto) pagination: PaginationMetaDto;
};


export class MessageResponseDto {
  @Expose()
  message: string;
};


export class LogResponseDto {
  @Expose() id: string;
  @Expose() createdAt: Date;
  @Expose() logLevel: LogLevel;
  @Expose() text: string;
  @Expose() forRoles: UserType[];
}