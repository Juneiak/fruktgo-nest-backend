import { Order } from './order.schema';
import { PaginateResult } from 'mongoose';
import {
  CreateOrderCommand,
  AcceptOrderCommand,
  StartAssemblyCommand,
  CompleteAssemblyCommand,
  CallCourierCommand,
  HandToCourierCommand,
  StartDeliveryCommand,
  DeliverOrderCommand,
  CancelOrderCommand,
  DeclineOrderCommand,
  ReturnOrderCommand,
  SetOrderRatingCommand,
} from './order.commands';
import {
  GetOrdersQuery,
  GetOrderQuery,

} from './order.queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

export interface OrderPort {
  // ====================================================
  // QUERIES
  // ==================================================== 
  getOrders(query: GetOrdersQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Order>>;
  getOrder(query: GetOrderQuery, queryOptions?: CommonQueryOptions): Promise<Order | null>;

  // ====================================================
  // COMMANDS
  // ====================================================
  createOrder(command: CreateOrderCommand, commandOptions?: CommonCommandOptions): Promise<Order>;
  acceptOrder(command: AcceptOrderCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  startAssembly(command: StartAssemblyCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  completeAssembly(command: CompleteAssemblyCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  callCourier(command: CallCourierCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  handToCourier(command: HandToCourierCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  startDelivery(command: StartDeliveryCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  deliverOrder(command: DeliverOrderCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  cancelOrder(command: CancelOrderCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  declineOrder(command: DeclineOrderCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  returnOrder(command: ReturnOrderCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  setOrderRating(command: SetOrderRatingCommand, commandOptions?: CommonCommandOptions): Promise<void>;
}

export const ORDER_PORT = Symbol('ORDER_PORT');