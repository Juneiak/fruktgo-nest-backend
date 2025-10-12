import { Injectable } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderPort } from './order.port'

@Injectable()
export class OrderFacade implements OrderPort {
  constructor(private readonly orderService: OrderService) {}

  // ====================================================
  // COMMANDS
  // ====================================================

  // ====================================================
  // QUERIES
  // ====================================================

}