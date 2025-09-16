import { UserType } from "src/common/enums/common.enum";


export interface AuthenticatedUser {
  id: string,
  type: UserType
}

export interface AuthenticatedEmployee {
  id: string,
  employeeName: string,
  telegramId: number,
  employer: string | null,
  pinnedTo: string | null
}

export interface StandardCoreOptions {
  sortByDate?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}