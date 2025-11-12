// import { Expose } from "class-transformer";
// import { Type } from 'class-transformer';
// import { IsInt, IsOptional, Min } from 'class-validator';


// export class MessageResponseDto {
//   @Expose()
//   message: string;
// };

// export class TelegramNotificationResponseDto {
//   @Expose()
//   message: string;

//   @Expose()
//   error?: string;
// };


// export class PaginationQueryDto {
//   @IsOptional()
//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   page?: number = 1;

//   @IsOptional()
//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   pageSize?: number = 10;
// };


// export class PaginationMetaDto {
//   @Expose()
//   currentPage: number;
  
//   @Expose()
//   pageSize: number;
  
//   @Expose()
//   totalItems: number;
  
//   @Expose()
//   totalPages: number;

//   // Навигация для TanStack Table
//   @Expose()
//   hasNextPage: boolean;
  
//   @Expose()
//   hasPrevPage: boolean;
  
//   @Expose()
//   nextPage: number | null;
  
//   @Expose()
//   prevPage: number | null;

//   // Удобные вычисляемые поля для UI
//   @Expose()
//   startIndex: number; // Индекс первого элемента на странице (1-based)
  
//   @Expose()
//   endIndex: number; // Индекс последнего элемента на странице
  
//   @Expose()
//   itemsOnPage: number; // Фактическое количество элементов на текущей странице
// };


// export class PaginatedResponseDto<T> {
//   @Expose()
//   items: T[];
  
//   @Expose()
//   @Type(() => PaginationMetaDto)
//   pagination: PaginationMetaDto;
// };