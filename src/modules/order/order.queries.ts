import { OrderStatus } from './order.enums';

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
    },
    public readonly options?: {
      populateProducts?: boolean;
      populateShop?: boolean;
      populateCustomer?: boolean;
    },
  ) {}
}

export class GetOrderQuery {
  constructor(
    public readonly orderId: string,
    public readonly options?: {
      populateProducts?: boolean;
      populateShop?: boolean;
      populateCustomer?: boolean;
    },
  ) {}
}
