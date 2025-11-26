export class SelectShopCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      shopId: string;
      force?: boolean; // Очистить корзину если другой магазин
    }
  ) {}
}

export class UnselectShopCommand {
  constructor(
    public readonly customerId: string,
  ) {}
}

export class AddProductCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      shopProductId: string;
      quantity: number;
    }
  ) {}
}

export class UpdateProductQuantityCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      shopProductId: string;
      quantity: number;
    }
  ) {}
}

export class RemoveProductCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      shopProductId: string;
    }
  ) {}
}

export class SetDeliveryCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      addressId: string;
    }
  ) {}
}

export class ClearCartCommand {
  constructor(
    public readonly customerId: string,
  ) {}
}

export class CreateCartCommand {
  constructor(
    public readonly customerId: string,
  ) {}
}
