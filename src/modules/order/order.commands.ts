import {
  OrderStatus,
  OrderCancelReason,
  OrderDeclineReason,
  OrderEventSource,
  OrderEventActorType
} from './order.enums';

export class CreateOrderCommand {
  constructor(
    public readonly payload: {
      customerId: string;
      shopId: string;
      shiftId: string;
      products: Array<{
        shopProductId: string;
        selectedQuantity: number;
      }>;
      delivery: {
        address: string;
        price: number;
        time: number;
      };
      finances: {
        totalCartSum: number;
        sentSum: number;
        deliveryPrice: number;
        systemTax: number;
        usedBonusPoints: number;
        totalSum: number;
      };
      customerComment?: string;
      metadata?: {
        source?: OrderEventSource;
        deviceInfo?: string;
        ipAddress?: string;
      };
    },
    public readonly orderId?: string
  ) {}
}

export class AcceptOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      employeeId: string;
      employeeName: string;
    },
  ) {}
}

export class StartAssemblyCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      employeeId: string;
      employeeName: string;
    },
  ) {}
}

export class CompleteAssemblyCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      employeeId: string;
      employeeName: string;
      actualProducts?: Array<{
        shopProductId: string;
        actualQuantity: number;
        weightCompensationBonus?: number;
      }>;
    },
  ) {}
}

export class CallCourierCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      employeeId: string;
      employeeName: string;
    },
  ) {}
}

export class HandToCourierCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      employeeId: string;
      employeeName: string;
      courierInfo?: string;
    },
  ) {}
}

export class StartDeliveryCommand {
  constructor(
    public readonly orderId: string,
  ) {}
}

export class DeliverOrderCommand {
  constructor(
    public readonly orderId: string,
  ) {}
}

export class CancelOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      reason: OrderCancelReason;
      canceledBy: {
        type: OrderEventActorType;
        id?: string;
        name?: string;
      };
      comment?: string;
    },
  ) {}
}

export class DeclineOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      reason: OrderDeclineReason;
      declinedBy: {
        type: OrderEventActorType;
        id?: string;
        name?: string;
      };
      comment?: string;
    },
  ) {}
}

export class ReturnOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      reason?: string;
      comment?: string;
    },
  ) {}
}

export class SetOrderRatingCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      customerId: string;
      customerName: string;
      rating: number;
      tags: string[];
      comment?: string;
    },
  ) {}
}

export class UpdateOrderStatusCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      newStatus: OrderStatus;
      actor?: {
        type: OrderEventActorType;
        id?: string;
        name?: string;
      };
      data?: Record<string, any>;
    },
  ) {}
}

export class AddOrderCommentCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      comment: string;
      actor: {
        type: OrderEventActorType;
        id?: string;
        name?: string;
      };
    },
  ) {}
}

export class UpdateOrderProductsCommand {
  constructor(
    public readonly orderId: string,
    public readonly payload: {
      products: Array<{
        shopProductId: string;
        actualQuantity?: number;
        weightCompensationBonus?: number;
      }>;
      updatedBy: {
        type: OrderEventActorType.EMPLOYEE | OrderEventActorType.ADMIN;
        id?: string;
        name?: string;
      };
    },
  ) {}
}