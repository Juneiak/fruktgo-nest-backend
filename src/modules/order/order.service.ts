import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { OrderModel, Order, OrderEvent, OrderProduct } from './order.schema';
import { OrderStatus, OrderEventType, OrderEventActorType, OrderEventSource } from './order.enums';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { checkId, selectFields } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import {
  GetOrdersQuery,
  GetOrderQuery,
} from './order.queries';
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
  createOrderEvent,
  createCancelEvent,
  createDeclineEvent,
  createRatingEvent,
  hasEvent,
} from './order.events.helpers';
import { canTransitionTo, isTerminalStatus } from './order.helpers';
import { OrderPort } from './order.port';

@Injectable()
export class OrderService implements OrderPort {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: OrderModel,
  ) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getOrder(
    query: GetOrderQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Order | null> {
    const { orderId, options } = query;
    checkId([orderId]);

    const dbQuery = this.orderModel.findById(new Types.ObjectId(orderId));
    if (queryOptions?.session) dbQuery.session(queryOptions.session);
    
    // Handle population options
    if (options?.populateProducts) dbQuery.populate('products.shopProduct');
    if (options?.populateShop) dbQuery.populate('orderedFrom.shop');
    if (options?.populateCustomer) dbQuery.populate('orderedBy.customer');

    // Handle select options
    if (options?.select && options.select.length > 0) {
      dbQuery.select(selectFields<Order>(...options.select));
    }
    
    const order = await dbQuery.lean({ virtuals: true }).exec();
    return order;
  }


  async getOrders(
    query: GetOrdersQuery,
    queryOptions?: CommonListQueryOptions<'orderedAt' | 'createdAt'>
  ): Promise<PaginateResult<Order>> {
    const { filters, options } = query;

    const dbQueryFilter: any = {};
    if (filters?.customerId) dbQueryFilter['orderedBy.customer'] = new Types.ObjectId(filters.customerId);
    if (filters?.shopId) dbQueryFilter['orderedFrom.shop'] = new Types.ObjectId(filters.shopId);
    if (filters?.employeeId) dbQueryFilter['handledBy.employee'] = new Types.ObjectId(filters.employeeId);
    if (filters?.shiftId) dbQueryFilter.shift = new Types.ObjectId(filters.shiftId);
    if (filters?.statuses && filters.statuses.length > 0) dbQueryFilter.orderStatus = { $in: filters.statuses };
    if (filters?.fromDate || filters?.toDate) {
      dbQueryFilter.orderedAt = {};
      if (filters.fromDate) dbQueryFilter.orderedAt.$gte = filters.fromDate;
      if (filters.toDate) dbQueryFilter.orderedAt.$lte = filters.toDate;
    }

    const dbQueryOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: queryOptions?.sort || { orderedAt: -1 }
    };

    const dbQueryPopulateArray: any[] = [];
    if (options?.populateProducts) dbQueryPopulateArray.push({ path: 'products.shopProduct' });
    if (options?.populateShop) dbQueryPopulateArray.push({ path: 'orderedFrom.shop' });
    if (options?.populateCustomer) dbQueryPopulateArray.push({ path: 'orderedBy.customer' });
    if (dbQueryPopulateArray.length > 0) dbQueryOptions.populate = dbQueryPopulateArray;

    // Handle select options
    if (options?.select && options.select.length > 0) {
      dbQueryOptions.select = selectFields<Order>(...options.select);
    }

    const result = await this.orderModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createOrder(
    command: CreateOrderCommand,
    options?: CommonCommandOptions
  ): Promise<Order> {
    const { payload, orderId } = command;
    const { 
      customerId,
      shopId,
      shiftId,
      products,
      delivery,
      finances,
      customerComment,
      metadata
    } = payload;

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
    const { orderId, payload } = command;
    const { employeeId, employeeName } = payload;
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
          type: OrderEventActorType.EMPLOYEE,
          id: new Types.ObjectId(employeeId),
          name: employeeName
        }
      ),
      createOrderEvent(
        OrderEventType.ASSEMBLY_STARTED,
        {
          type: OrderEventActorType.EMPLOYEE,
          id: new Types.ObjectId(employeeId),
          name: employeeName
        }
      )
    );

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }


  async startAssembly(
    command: StartAssemblyCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId, payload } = command;
    const { employeeId, employeeName } = payload;
    checkId([orderId, employeeId]);

    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) {
      throw DomainError.notFound('Order', orderId);
    }

    // Validate transition (from PENDING or ASSEMBLING to ASSEMBLING)
    if (order.orderStatus !== OrderStatus.PENDING && order.orderStatus !== OrderStatus.ASSEMBLING) {
      throw DomainError.invariant(
        `Cannot start assembly in status ${order.orderStatus}`,
        { currentStatus: order.orderStatus }
      );
    }

    // Add event if not already started
    if (!hasEvent(order.events, OrderEventType.ASSEMBLY_STARTED)) {
      order.orderStatus = OrderStatus.ASSEMBLING;
      order.events.push(
        createOrderEvent(
          OrderEventType.ASSEMBLY_STARTED,
          {
            type: OrderEventActorType.EMPLOYEE,
            id: new Types.ObjectId(employeeId),
            name: employeeName
          }
        )
      );
    }

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }


  async completeAssembly(
    command: CompleteAssemblyCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId, payload } = command;
    const { employeeId, employeeName, actualProducts } = payload;
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
          type: OrderEventActorType.EMPLOYEE,
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


  async callCourier(
    command: CallCourierCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId, payload } = command;
    const { employeeId, employeeName } = payload;
    checkId([orderId, employeeId]);

    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) {
      throw DomainError.notFound('Order', orderId);
    }

    // Validate status (should be AWAITING_COURIER)
    if (order.orderStatus !== OrderStatus.AWAITING_COURIER) {
      throw DomainError.invariant(
        `Cannot call courier in status ${order.orderStatus}`,
        { currentStatus: order.orderStatus }
      );
    }

    // Add courier called event if not exists
    if (!hasEvent(order.events, OrderEventType.COURIER_CALLED)) {
      order.events.push(
        createOrderEvent(
          OrderEventType.COURIER_CALLED,
          {
            type: OrderEventActorType.EMPLOYEE,
            id: new Types.ObjectId(employeeId),
            name: employeeName
          }
        )
      );
    }

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }


  async handToCourier(
    command: HandToCourierCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId, payload } = command;
    const { employeeId, employeeName, courierInfo } = payload;
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
            type: OrderEventActorType.EMPLOYEE,
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
          type: OrderEventActorType.EMPLOYEE,
          id: new Types.ObjectId(employeeId),
          name: employeeName
        },
        { courierInfo }
      ),
      createOrderEvent(OrderEventType.DELIVERY_STARTED, undefined)
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
        undefined,
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
    const { orderId, payload } = command;
    const { reason, canceledBy, comment } = payload;
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
    const { orderId, payload } = command;
    const { reason, declinedBy, comment } = payload;
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
          type: declinedBy.type,
          id: new Types.ObjectId(declinedBy.id),
          name: declinedBy.name
        } : undefined
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
    const { orderId, payload } = command;
    const { customerId, customerName, rating, tags, comment } = payload;
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
          type: OrderEventActorType.CUSTOMER,
          id: new Types.ObjectId(customerId),
          name: customerName
        }
      )
    );

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }


  async startDelivery(
    command: StartDeliveryCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId } = command;
    checkId([orderId]);

    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) {
      throw DomainError.notFound('Order', orderId);
    }

    // Validate status (should be IN_DELIVERY)
    if (order.orderStatus !== OrderStatus.IN_DELIVERY) {
      throw DomainError.invariant(
        `Cannot start delivery in status ${order.orderStatus}`,
        { currentStatus: order.orderStatus }
      );
    }

    // Add delivery started event if not exists
    if (!hasEvent(order.events, OrderEventType.DELIVERY_STARTED)) {
      order.events.push(
        createOrderEvent(OrderEventType.DELIVERY_STARTED, undefined)
      );
    }

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }


  async returnOrder(
    command: ReturnOrderCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { orderId, payload } = command;
    const { reason, comment } = payload;
    checkId([orderId]);

    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) {
      throw DomainError.notFound('Order', orderId);
    }

    // Can only return delivered orders
    if (order.orderStatus !== OrderStatus.DELIVERED) {
      throw DomainError.invariant(
        `Can only return delivered orders. Current status: ${order.orderStatus}`,
        { currentStatus: order.orderStatus }
      );
    }

    // Update status and add event
    order.orderStatus = OrderStatus.RETURNED;
    order.events.push(
      createOrderEvent(
        OrderEventType.RETURNED,
        undefined,
        { reason, comment }
      )
    );

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await order.save(saveOptions);
  }
}
