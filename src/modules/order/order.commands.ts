import { Types } from 'mongoose';
import { OrderStatus, OrderCancelReason, OrderDeclineReason, OrderEventSource, OrderEventActorType } from './order.enums';

export class CreateOrderCommand {
  constructor(
    public readonly customerId: string,
    public readonly shopId: string,
    public readonly shiftId: string,
    public readonly products: Array<{
      shopProductId: string;
      selectedQuantity: number;
    }>,
    public readonly delivery: {
      address: string;
      price: number;
      time: number;
    },
    public readonly finances: {
      totalCartSum: number;
      sentSum: number;
      deliveryPrice: number;
      systemTax: number;
      usedBonusPoints: number;
      totalSum: number;
    },
    public readonly customerComment?: string,
    public readonly metadata?: {
      source?: OrderEventSource;
      deviceInfo?: string;
      ipAddress?: string;
    }
  ) {}
}

export class AcceptOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly employeeId: string,
    public readonly employeeName: string,
  ) {}
}

export class StartAssemblyCommand {
  constructor(
    public readonly orderId: string,
    public readonly employeeId: string,
    public readonly employeeName: string,
  ) {}
}

export class CompleteAssemblyCommand {
  constructor(
    public readonly orderId: string,
    public readonly employeeId: string,
    public readonly employeeName: string,
    public readonly actualProducts?: Array<{
      shopProductId: string;
      actualQuantity: number;
      weightCompensationBonus?: number;
    }>,
  ) {}
}

export class CallCourierCommand {
  constructor(
    public readonly orderId: string,
    public readonly employeeId: string,
    public readonly employeeName: string,
  ) {}
}

export class HandToCourierCommand {
  constructor(
    public readonly orderId: string,
    public readonly employeeId: string,
    public readonly employeeName: string,
    public readonly courierInfo?: string,
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
    public readonly reason: OrderCancelReason,
    public readonly canceledBy: {
      type: OrderEventActorType;
      id?: string;
      name?: string;
    },
    public readonly comment?: string,
  ) {}
}

export class DeclineOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly reason: OrderDeclineReason,
    public readonly declinedBy: {
      type: OrderEventActorType;
      id?: string;
      name?: string;
    },
    public readonly comment?: string,
  ) {}
}

export class ReturnOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly reason?: string,
    public readonly comment?: string,
  ) {}
}

export class SetOrderRatingCommand {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly customerName: string,
    public readonly rating: number,
    public readonly tags: string[],
    public readonly comment?: string,
  ) {}
}

export class UpdateOrderStatusCommand {
  constructor(
    public readonly orderId: string,
    public readonly newStatus: OrderStatus,
    public readonly actor?: {
      type: OrderEventActorType;
      id?: string;
      name?: string;
    },
    public readonly data?: Record<string, any>,
  ) {}
}

export class AddOrderCommentCommand {
  constructor(
    public readonly orderId: string,
    public readonly comment: string,
    public readonly actor: {
      type: OrderEventActorType;
      id?: string;
      name?: string;
    },
  ) {}
}

export class UpdateOrderProductsCommand {
  constructor(
    public readonly orderId: string,
    public readonly products: Array<{
      shopProductId: string;
      actualQuantity?: number;
      weightCompensationBonus?: number;
    }>,
    public readonly updatedBy: {
      type: OrderEventActorType.EMPLOYEE | OrderEventActorType.ADMIN ;
      id?: string;
      name?: string;
    },
  ) {}
}