import { Expose, Type } from "class-transformer";


export class PaginationMetaDto {
  @Expose()
  currentPage: number;
  
  @Expose()
  pageSize: number;
  
  @Expose()
  totalItems: number;
  
  @Expose()
  totalPages: number;
};


export class PaginatedResponseDto<T> {
  @Expose()
  items: T[];
  
  @Expose()
  @Type(() => PaginationMetaDto)
  pagination: PaginationMetaDto;
};


export class MessageResponseDto {
  @Expose()
  message: string;
};

