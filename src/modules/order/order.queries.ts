import { OrderStatus, OrderEventType } from './order.enums';


export type GetOrdersOptions = {
  populateProducts?: boolean;
  populateShop?: boolean;
  populateCustomer?: boolean;
  populateEmployee?: boolean;
  populateImages?: boolean;
};

export class GetOrdersQuery {
  constructor(
    public readonly filters?: {
        customerId?: string;
        shopId?: string;
        employeeId?: string;
        shiftId?: string;
        statuses?: OrderStatus[];
        fromDate?: Date;
        toDate?: Date;
        hasRating?: boolean;
        hasIssues?: boolean;
    },
    public readonly options?: GetOrdersOptions,
  ) {}
}

export class GetOrderQuery {
  constructor(
    public readonly orderId: string,
    public readonly options?: GetOrdersOptions,
  ) {}
}

export class GetOrderEventsQuery {
  constructor(
    public readonly orderId: string,
    public readonly filters?: {
      types?: OrderEventType[];
      actorId?: string;
      fromDate?: Date;
      toDate?: Date;
    },
  ) {}
}

export class GetActiveOrdersQuery {
  constructor(
    public readonly filters?: {
      shopId?: string;
      customerId?: string;
      employeeId?: string;
    },
    public readonly options?: GetOrdersOptions,
  ) {}
}


export class ValidateOrderTransitionQuery {
  constructor(
    public readonly orderId: string,
    public readonly targetStatus: OrderStatus,
  ) {}
}
