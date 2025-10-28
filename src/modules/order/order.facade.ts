import { Injectable } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderPort } from './order.port';
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

@Injectable()
export class OrderFacade implements OrderPort {
  constructor(private readonly orderService: OrderService) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getOrders(
    query: GetOrdersQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Order>> {
    return this.orderService.getOrders(query, queryOptions);
  }

  async getOrder(
    query: GetOrderQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Order | null> {
    return this.orderService.getOrder(query, queryOptions);
  }

  // ====================================================
  // COMMANDS
  // ====================================================
  async createOrder(
    command: CreateOrderCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Order> {
    return this.orderService.createOrder(command, commandOptions);
  }

  async acceptOrder(
    command: AcceptOrderCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.orderService.acceptOrder(command, commandOptions);
  }

  async startAssembly(
    command: StartAssemblyCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    // StartAssembly просто вызывает acceptOrder
    const acceptCommand = new AcceptOrderCommand(
      command.orderId,
      command.payload
    );
    return this.orderService.acceptOrder(acceptCommand, commandOptions);
  }

  async completeAssembly(
    command: CompleteAssemblyCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.orderService.completeAssembly(command, commandOptions);
  }

  async callCourier(
    command: CallCourierCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    // CallCourier не реализован в service, используем completeAssembly
    const completeCommand = new CompleteAssemblyCommand(
      command.orderId,
      {
        employeeId: command.payload.employeeId,
        employeeName: command.payload.employeeName,
        actualProducts: undefined
      }
    );
    return this.orderService.completeAssembly(completeCommand, commandOptions);
  }

  async handToCourier(
    command: HandToCourierCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.orderService.handToCourier(command, commandOptions);
  }

  async startDelivery(
    command: StartDeliveryCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    // StartDelivery происходит автоматически при handToCourier
    throw new Error('StartDelivery happens automatically with HandToCourier');
  }

  async deliverOrder(
    command: DeliverOrderCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.orderService.deliverOrder(command, commandOptions);
  }

  async cancelOrder(
    command: CancelOrderCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.orderService.cancelOrder(command, commandOptions);
  }

  async declineOrder(
    command: DeclineOrderCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.orderService.declineOrder(command, commandOptions);
  }

  async returnOrder(
    command: ReturnOrderCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    // Return не реализован в service, нужно добавить
    throw new Error('ReturnOrder not implemented yet');
  }

  async setOrderRating(
    command: SetOrderRatingCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.orderService.setOrderRating(command, commandOptions);
  }
}