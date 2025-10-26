import { ClientSession } from "mongoose";

export type SortOrder = 1 | -1;
export type Sortable<K extends string> = Partial<Record<K, SortOrder>>;

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface CommonListQueryOptions<K extends string> {
  pagination?: PaginationOptions;
  sort?: Sortable<K>;
  session?: ClientSession;
}


export interface CommonQueryOptions {
  session?: ClientSession;
}