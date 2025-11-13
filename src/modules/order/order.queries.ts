import { OrderStatus } from './order.enums';
import { Order } from './order.schema';

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
      select?: (keyof Order)[];
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
      select?: (keyof Order)[];
      populateProducts?: boolean;
      populateShop?: boolean;
      populateCustomer?: boolean;
    },
  ) {}
}
