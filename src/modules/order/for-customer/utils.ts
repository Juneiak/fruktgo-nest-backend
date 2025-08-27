import { OrderForCustomerPreviewResponseDto } from "src/modules/order/for-customer/order-for-customer.dtos";
import { Order } from "../order.schema";
import { plainToInstance } from "class-transformer";

export const transformOrderToPreview = (order: Order): OrderForCustomerPreviewResponseDto => {
  return plainToInstance(OrderForCustomerPreviewResponseDto, {
    orderId: order._id.toString(),
    orderStatus: order.orderStatus,
    orderedBy: order.orderedBy,
    orderedFrom: order.orderedFrom,
    orderedAt: order.orderedAt,
    acceptedAt: order.acceptedAt,
    deliveredAt: order.deliveredAt,
    canceledAt: order.canceledAt,
    canceledReason: order.canceledReason,
    customerComment: order.customerComment,
    settedRating: order.rating?.settedRating || null,
    sentSum: order.finances.sentSum,
    usedBonusPoints: order.finances.usedBonusPoints,
    totalWeightCompensationBonus: order.finances.totalWeightCompensationBonus
  }, { excludeExtraneousValues: true });
};