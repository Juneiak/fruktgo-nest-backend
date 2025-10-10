import { VerifiedStatus } from "src/common/enums/common.enum"
import { BlockPayload } from "src/common/types/comands"
import { EmployeeStatus } from "../employee.enums"

export type UpdateEmployeePayload = {
  verifiedStatus?: VerifiedStatus,
  internalNote?: string | null,
  position?: string | null,
  salary?: string | null,
  sellerNote?: string | null,
  status?: EmployeeStatus
}

export class UpdateEmployeeCommand {
  constructor(
    public readonly employeeId: string,
    public readonly payload: UpdateEmployeePayload
  ) {}
};


export class BlockEmployeeCommand {
  constructor(
    public readonly employeeId: string, 
    public readonly payload: BlockPayload
  ) {}
}