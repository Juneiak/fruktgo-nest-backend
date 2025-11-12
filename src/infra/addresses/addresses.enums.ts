import { UserType } from "src/common/enums/common.enum";

export enum AddressEntityType {
  CUSTOMER = UserType.CUSTOMER,
  SHOP = UserType.SHOP,
  EMPLOYEE = UserType.EMPLOYEE,
}

export enum AddressLabel {
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other',
}
