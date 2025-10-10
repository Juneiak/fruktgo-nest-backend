import { VerifiedStatus, UserSex} from "src/common/enums/common.enum"
import { BlockPayload } from "src/common/types/comands"

export type UpdateCustomerPayload = {
  verifiedStatus?: VerifiedStatus,
  bonusPoints?: number,
  internalNote?: string | null,
  customerName?: string | null,
  sex?: UserSex,
  birthDate?: Date | null,
  email?: string | null
}
export class UpdateCustomerCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: UpdateCustomerPayload
  ) {}
};


export class BlockCustomerCommand {
  constructor(
    public readonly customerId: string, 
    public readonly payload: BlockPayload
  ) {}
}

export type AddAddressPayload = {
  latitude: number;
  longitude: number;
  city: string;
  street: string;
  house: string;
  apartment?: string | null;
  floor?: string | null;
  entrance?: string | null;
  intercomCode?: string | null;
}
export class AddAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: AddAddressPayload
  ) {}
}


export class DeleteAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly addressId: string
  ) {}
}

export class SelectAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly addressId: string
  ) {}
}
