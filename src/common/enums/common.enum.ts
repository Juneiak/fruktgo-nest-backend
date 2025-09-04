export enum BlockStatus {
	ACTIVE = 'active',          // нет ограничений
	BLOCKED = 'blocked',        // блокировка без срока
	SUSPENDED = 'suspended',    // временная приостановка до blockedUntil
};
