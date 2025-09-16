export enum BlockStatus {
	ACTIVE = 'active',          // нет ограничений
	BLOCKED = 'blocked',        // блокировка без срока
	SUSPENDED = 'suspended',    // временная приостановка до blockedUntil
};

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
