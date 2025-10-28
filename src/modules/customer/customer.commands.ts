import { VerifiedStatus, UserSex} from "src/common/enums/common.enum"
import { BlockPayload } from "src/common/types/commands"


export class CreateCustomerCommand {
  constructor(
    public readonly payload: {
      telegramId: number;
      customerName: string;
      telegramUsername?: string;
      telegramFirstName?: string;
      telegramLastName?: string;
      phone?: string;
      email?: string;
    }
  ) {}
}


export class UpdateCustomerCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      verifiedStatus?: VerifiedStatus,
      bonusPoints?: number,
      internalNote?: string | null,
      customerName?: string | null,
      sex?: UserSex,
      birthDate?: Date | null,
      email?: string | null
    }
  ) {}
}


export class BlockCustomerCommand {
  constructor(
    public readonly customerId: string, 
    public readonly payload: BlockPayload
  ) {}
}


export class AddAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
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
  ) {}
}


export class DeleteAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      addressId: string
    }
  ) {}
}


export class SelectAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      addressId: string
    }
  ) {}
}
