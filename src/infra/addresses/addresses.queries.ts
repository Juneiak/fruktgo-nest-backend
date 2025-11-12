export class GetEntityAddressesQuery {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly filters?: {
      label?: string;
      city?: string;
    },
  ) {}
}

export class GetNearbyAddressesQuery {
  constructor(
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly radiusKm: number,
    public readonly filters?: {
      entityType?: string;
      city?: string;
    },
  ) {}
}
