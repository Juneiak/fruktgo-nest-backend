import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { OrderModel, Order, OrderEvent, OrderProduct } from './order.schema';
import { OrderStatus, OrderEventType, OrderEventActorType, OrderEventSource } from './order.enums';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { checkId } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import {
  GetOrdersQuery,
  GetOrderQuery,
  GetActiveOrdersQuery,
  GetOrderEventsQuery,
} from './order.queries';
import {
  CreateOrderCommand,
  AcceptOrderCommand,
  CompleteAssemblyCommand,
  HandToCourierCommand,
  DeliverOrderCommand,
  CancelOrderCommand,
  DeclineOrderCommand,
  SetOrderRatingCommand,
} from './order.commands';
import {
  createOrderEvent,
  createCancelEvent,
  createDeclineEvent,
  createRatingEvent,
  hasEvent,
  getEventsTimeline,
} from './order.events.helpers';
import { canTransitionTo, isTerminalStatus } from './order.helpers';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: OrderModel,
  ) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getOrder(
    query: GetOrderQuery,
    options?: CommonQueryOptions
  ): Promise<Order | null> {
    const { orderId, options: queryOptions } = query;
    checkId([orderId]);

    const dbQuery = this.orderModel.findById(new Types.ObjectId(orderId));
    if (options?.session) dbQuery.session(options.session);
    
    // Handle population options
    if (queryOptions?.populateProducts) dbQuery.populate('products.shopProduct');
    if (queryOptions?.populateShop) dbQuery.populate('orderedFrom.shop');
    if (queryOptions?.populateCustomer) dbQuery.populate('orderedBy.customer');

    const order = await dbQuery.lean({ virtuals: true }).exec();
    return order;
  }


  async getOrders(
    query: GetOrdersQuery,
    options: CommonListQueryOptions<'orderedAt' | 'createdAt'>
  ): Promise<PaginateResult<Order>> {
    const { filters, options: queryOptions } = query;

    // Build query filter
    const queryFilter: any = {};
    if (filters?.customerId) queryFilter['orderedBy.customer'] = new Types.ObjectId(filters.customerId);
    if (filters?.shopId) queryFilter['orderedFrom.shop'] = new Types.ObjectId(filters.shopId);
    if (filters?.employeeId) queryFilter['handledBy.employee'] = new Types.ObjectId(filters.employeeId);
    if (filters?.shiftId) queryFilter.shift = new Types.ObjectId(filters.shiftId);
    if (filters?.statuses && filters.statuses.length > 0) {
      queryFilter.orderStatus = { $in: filters.statuses };
    }
    if (filters?.fromDate || filters?.toDate) {
      queryFilter.orderedAt = {};
      if (filters.fromDate) queryFilter.orderedAt.$gte = filters.fromDate;
      if (filters.toDate) queryFilter.orderedAt.$lte = filters.toDate;
    }

    // Build paginate options
    const paginateOptions: any = {
      page: options.pagination?.page || 1,
      limit: options.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: options.sort || { orderedAt: -1 }
    };

    // Handle population
    if (queryOptions?.populateProducts) {
      paginateOptions.populate = paginateOptions.populate || [];
      paginateOptions.populate.push({ path: 'products.shopProduct' });
    }

    const result = await this.orderModel.paginate(queryFilter, paginateOptions);
    return result;
  }


  async getActiveOrders(
    query: GetActiveOrdersQuery,
    options: CommonListQueryOptions<'orderedAt'>
  ): Promise<PaginateResult<Order>> {
    const activeStatuses = [
      OrderStatus.PENDING,
      OrderStatus.ASSEMBLING,
      OrderStatus.AWAITING_COURIER,
      OrderStatus.IN_DELIVERY
    ];

    const ordersQuery = new GetOrdersQuery(
      {
        ...query.filters,
        statuses: activeStatuses
      },
      query.options
    );

    return this.getOrders(ordersQuery, options);
  }


  async getOrderEvents(
    query: GetOrderEventsQuery,
    options?: CommonQueryOptions
  ): Promise<OrderEvent[]> {
    const { orderId, filters } = query;
    checkId([orderId]);

    const order = await this.getOrder(
      new GetOrderQuery(orderId),
      options
    );

    if (!order) throw DomainError.notFound('Order', orderId);

    let events = order.events;

    // Apply filters
    if (filters?.types && filters.types.length > 0) {
      events = events.filter(e => filters.types!.includes(e.type));
    }
    if (filters?.actorId) {
      events = events.filter(e => e.actor?.id?.toString() === filters.actorId);
    }

    return getEventsTimeline(events);
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createOrder(
    command: CreateOrderCommand,
    options?: CommonCommandOptions
  ): Promise<Order> {
    const { 
      customerId,
      shopId,
      shiftId,
      products,
      delivery,
      finances,
      customerComment,
      metadata
    } = command;

    checkId([customerId, shopId, shiftId]);
    
    // Create order products
    const orderProducts: OrderProduct[] = products.map(p => ({
      shopProduct: new Types.ObjectId(p.shopProductId),
      category: null as any, // Will be filled by orchestrator
      productName: '', // Will be filled by orchestrator
      price: 0, // Will be filled by orchestrator
      cardImage: null,
      measuringScale: null as any, // Will be filled by orchestrator
      selectedQuantity: p.selectedQuantity,
      actualQuantity: null,
      weightCompensationBonus: 0
    }));

    // Create initial event
    const createdEvent = createOrderEvent(
      OrderEventType.CREATED,
      {
        type: OrderEventActorType.CUSTOMER,
        id: new Types.ObjectId(customerId),
        name: '' // Will be filled by orchestrator
      },
      {
        products: products,
        source: metadata?.source
      },
      metadata
    );

    // Create order
    const order = await this.orderModel.create({
      orderStatus: OrderStatus.PENDING,
      orderedAt: new Date(),
      orderedBy: {
        customer: new Types.ObjectId(customerId),
        customerName: '' // Will be filled by orchestrator
      },
      orderedFrom: {
        shop: new Types.ObjectId(shopId),
        shopName: '', // Will be filled by orchestrator
        shopImage: '' // Will be filled by orchestrator
      },
      shift: new Types.ObjectId(shiftId),
      customerComment: customerComment || null,
      events: [createdEvent],
      handledBy: null,
      delivery: {
        deliveryAddress: delivery.address,
        deliveryPrice: delivery.price,
        deliveryTime: delivery.time
      },
      finances: {
        totalCartSum: finances.totalCartSum,
        sentSum: finances.sentSum,
        deliveryPrice: finances.deliveryPrice,
        systemTax: finances.systemTax,
        usedBonusPoints: finances.usedBonusPoints,
        totalWeightCompensationBonus: 0,
        totalSum: finances.totalSum
      },
      rating: {
        settedRating: 0,
        feedbackAt: null,
        feedbackTags: [],
        feedbackComment: ''
      },
      products: orderProducts
    });

    return order.toObject({ virtuals: true });
  }


  async acceptOrder(
    command: AcceptOrderCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId, employeeId, employeeName } = command;
    checkId([orderId, employeeId]);

    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) {
      throw DomainError.notFound('Order', orderId);
    }

    // Validate transition
    if (!canTransitionTo(order.orderStatus, OrderStatus.ASSEMBLING)) {
      throw DomainError.invariant(
        `Cannot accept order in status ${order.orderStatus}`,
        { currentStatus: order.orderStatus }
      );
    }

    // Update status and add events
    order.orderStatus = OrderStatus.ASSEMBLING;
    order.events.push(
      createOrderEvent(
        OrderEventType.ACCEPTED,
        {
          type: 'employee',
          id: new Types.ObjectId(employeeId),
          name: employeeName
        }
      ),
      createOrderEvent(
        OrderEventType.ASSEMBLY_STARTED,
        {
          type: 'employee',
          id: new Types.ObjectId(employeeId),
          name: employeeName
        }
      )
    );

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }

  async completeAssembly(
    command: CompleteAssemblyCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId, employeeId, employeeName, actualProducts } = command;
    checkId([orderId, employeeId]);

    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) {
      throw DomainError.notFound('Order', orderId);
    }

    // Validate transition
    if (!canTransitionTo(order.orderStatus, OrderStatus.AWAITING_COURIER)) {
      throw DomainError.invariant(
        `Cannot complete assembly in status ${order.orderStatus}`,
        { currentStatus: order.orderStatus }
      );
    }

    // Update products if provided
    if (actualProducts && actualProducts.length > 0) {
      actualProducts.forEach(ap => {
        const product = order.products.find(
          p => p.shopProduct.toString() === ap.shopProductId
        );
        if (product) {
          product.actualQuantity = ap.actualQuantity;
          product.weightCompensationBonus = ap.weightCompensationBonus || 0;
        }
      });
    }

    // Update status and add event
    order.orderStatus = OrderStatus.AWAITING_COURIER;
    order.events.push(
      createOrderEvent(
        OrderEventType.ASSEMBLY_COMPLETED,
        {
          type: 'employee',
          id: new Types.ObjectId(employeeId),
          name: employeeName
        },
        {
          actualProducts: actualProducts
        }
      )
    );

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }


  async handToCourier(
    command: HandToCourierCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId, employeeId, employeeName, courierInfo } = command;
    checkId([orderId, employeeId]);

    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw DomainError.notFound('Order', orderId);

    // Validate transition
    if (!canTransitionTo(order.orderStatus, OrderStatus.IN_DELIVERY)) {
      throw DomainError.invariant(
        `Cannot hand to courier in status ${order.orderStatus}`,
        { currentStatus: order.orderStatus }
      );
    }

    // Add courier called event if not exists
    if (!hasEvent(order.events, OrderEventType.COURIER_CALLED)) {
      order.events.push(
        createOrderEvent(
          OrderEventType.COURIER_CALLED,
          {
            type: 'employee',
            id: new Types.ObjectId(employeeId),
            name: employeeName
          }
        )
      );
    }

    // Update status and add events
    order.orderStatus = OrderStatus.IN_DELIVERY;
    order.events.push(
      createOrderEvent(
        OrderEventType.HANDED_TO_COURIER,
        {
          type: 'employee',
          id: new Types.ObjectId(employeeId),
          name: employeeName
        },
        { courierInfo }
      ),
      createOrderEvent(OrderEventType.DELIVERY_STARTED, { type: 'system' })
    );

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }

  async deliverOrder(
    command: DeliverOrderCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId } = command;
    checkId([orderId]);

    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw DomainError.notFound('Order', orderId);

    // Validate transition
    if (!canTransitionTo(order.orderStatus, OrderStatus.DELIVERED)) {
      throw DomainError.invariant(
        `Cannot deliver order in status ${order.orderStatus}`,
        { currentStatus: order.orderStatus }
      );
    }

    // Update status and add event
    order.orderStatus = OrderStatus.DELIVERED;
    order.events.push(
      createOrderEvent(
        OrderEventType.DELIVERED,
        { type: 'system' },
        { deliveredAt: new Date() }
      )
    );

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }

  async cancelOrder(
    command: CancelOrderCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId, reason, canceledBy, comment } = command;
    checkId([orderId]);

    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw DomainError.notFound('Order', orderId);

    // Check if already terminal
    if (isTerminalStatus(order.orderStatus)) {
      throw DomainError.invariant(
        `Cannot cancel order in terminal status ${order.orderStatus}`,
        { currentStatus: order.orderStatus }
      );
    }

    // Update status and add event
    order.orderStatus = OrderStatus.CANCELLED;
    order.events.push(
      createCancelEvent(
        reason,
        comment,
        canceledBy.id ? {
          type: canceledBy.type,
          id: new Types.ObjectId(canceledBy.id),
          name: canceledBy.name
        } : { type: canceledBy.type }
      )
    );

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }


  async declineOrder(
    command: DeclineOrderCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId, reason, declinedBy, comment } = command;
    checkId([orderId]);

    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) {
      throw DomainError.notFound('Order', orderId);
    }

    // Check if already terminal
    if (isTerminalStatus(order.orderStatus)) {
      throw DomainError.invariant(
        `Cannot decline order in terminal status ${order.orderStatus}`,
        { currentStatus: order.orderStatus }
      );
    }

    // Update status and add event
    order.orderStatus = OrderStatus.DECLINED;
    order.events.push(
      createDeclineEvent(
        reason,
        comment,
        declinedBy.id ? {
          type: declinedBy.type as 'employee' | 'system',
          id: new Types.ObjectId(declinedBy.id),
          name: declinedBy.name
        } : { type: 'system' }
      )
    );

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }

  async setOrderRating(
    command: SetOrderRatingCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId, customerId, customerName, rating, tags, comment } = command;
    checkId([orderId, customerId]);

    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw DomainError.notFound('Order', orderId);

    // Verify customer owns the order
    if (order.orderedBy.customer.toString() !== customerId) {
      throw DomainError.forbidden(
        'Only the customer who placed the order can rate it',
        { customerId, orderCustomerId: order.orderedBy.customer.toString() }
      );
    }

    // Can only rate delivered orders
    if (order.orderStatus !== OrderStatus.DELIVERED) {
      throw DomainError.invariant(
        `Can only rate delivered orders. Current status: ${order.orderStatus}`,
        { currentStatus: order.orderStatus }
      );
    }

    // Update rating
    order.rating = {
      settedRating: rating,
      feedbackAt: new Date(),
      feedbackTags: tags as any,
      feedbackComment: comment || ''
    };

    // Add event
    order.events.push(
      createRatingEvent(
        rating,
        tags,
        comment,
        {
          type: 'customer',
          id: new Types.ObjectId(customerId),
          name: customerName
        }
      )
    );

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }
}
