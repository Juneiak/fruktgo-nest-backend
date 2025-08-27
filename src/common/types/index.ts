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

export enum UserType {
  SELLER='seller',
  CUSTOMER='customer',
  ADMIN='admin',
  SHOP='shop',
  EMPLOYEE='employee',
}

export enum VerifiedStatus {
  VERIFIED='verified',
  NOT_VERIFIED='notVerified',
  IS_CHECKING='isChecking',
}

export enum UserSex {
  MALE='male',
  FEMALE='female',
  NOT_SPECIFIED='notSpecified',
}
