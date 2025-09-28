import { ClientSession } from "mongoose";

export type SortOrder = 1 | -1;
export type SortSpec = Record<string, SortOrder>;

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface CommonListQueryOptions<TSort extends SortSpec = SortSpec> {
  pagination?: PaginationOptions;
  sort?: TSort;         // default { createdAt: -1 }
  session?: ClientSession;
}

export interface CommonQueryOptions {
  session?: ClientSession;
}