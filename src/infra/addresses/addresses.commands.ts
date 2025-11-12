export class CreateAddressCommand {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly payload: {
      latitude: number;
      longitude: number;
      city: string;
      street: string;
      house: string;
      apartment?: string;
      floor?: string;
      entrance?: string;
      intercomCode?: string;
      label?: string;
    },
    public readonly addressId?: string,
  ) {}
}

export class UpdateAddressCommand {
  constructor(
    public readonly addressId: string,
    public readonly payload: {
      latitude?: number;
      longitude?: number;
      city?: string;
      street?: string;
      house?: string;
      apartment?: string;
      floor?: string;
      entrance?: string;
      intercomCode?: string;
      label?: string;
    },
  ) {}
}

export class DeleteAllEntityAddressesCommand {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
  ) {}
}
