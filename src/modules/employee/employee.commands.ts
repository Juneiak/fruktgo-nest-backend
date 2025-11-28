import { VerifiedStatus } from "src/common/enums/common.enum"
import { BlockPayload } from "src/common/types/commands"
import { EmployeeStatus } from "./employee.enums"


export class CreateEmployeeCommand {
  constructor(
    public readonly payload: {
      employerId: string;           // Seller ID
      employeeName: string;
      phone: string;
      pinnedTo?: string;            // Shop ID (optional)
      position?: string;
      salary?: string;
      sellerNote?: string;
    }
  ) {}
}


export class ActivateEmployeeCommand {
  constructor(
    public readonly employeeId: string,
    public readonly payload: {
      telegramId: number;
      telegramUsername?: string;
      telegramFirstName?: string;
      telegramLastName?: string;
    }
  ) {}
}


export class UpdateEmployeeCommand {
  constructor(
    public readonly employeeId: string,
    public readonly payload: {
      verifiedStatus?: VerifiedStatus,
      internalNote?: string | null,
      position?: string | null,
      salary?: string | null,
      sellerNote?: string | null,
      status?: EmployeeStatus
    }
  ) {}
}


export class BlockEmployeeCommand {
  constructor(
    public readonly employeeId: string, 
    public readonly payload: BlockPayload
  ) {}
}