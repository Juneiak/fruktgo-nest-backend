import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { AccessPort, ACCESS_PORT } from 'src/infra/access';
import { DomainErrorCode, handleServiceError } from 'src/common/errors';
import { plainToInstance } from 'class-transformer';
import {
  CreateOrderDto,
  CancelOrderDto,
  RateTheOrderDto,
} from "./customer.orders.request.dtos";
import {
  OrderFullResponseDto,
  OrderPreviewResponseDto,
  OrderCreatedResponseDto,
  RateTheOrderResponseDto
} from "./customer.orders.response.dtos";
import { AuthenticatedUser } from 'src/common/types';
import {
  OrderPort,
  ORDER_PORT,
  OrderQueries,
  OrderEnums,
} from 'src/modules/order';
import {
  CustomerPort,
  CUSTOMER_PORT,
  CustomerQueries,
} from 'src/modules/customer';
import {
  AddressesPort,
  ADDRESSES_PORT,
} from 'src/infra/addresses';
import {
  OrderProcessOrchestrator,
  ORDER_PROCESS_ORCHESTRATOR,
  CheckoutInput,
  CancelOrderInput,
  SetRatingInput,
} from 'src/processes/order';

@Injectable()
export class CustomerOrdersRoleService {
  constructor(
    @Inject(ORDER_PORT) private readonly orderPort: OrderPort,
    @Inject(CUSTOMER_PORT) private readonly customerPort: CustomerPort,
    @Inject(ADDRESSES_PORT) private readonly addressesPort: AddressesPort,
    @Inject(ACCESS_PORT) private readonly accessPort: AccessPort,
    @Inject(ORDER_PROCESS_ORCHESTRATOR) private readonly orderProcess: OrderProcessOrchestrator,
  ) {}

  // ====================================================
  // ORDERS 
  // ====================================================

  /**
   * Создание заказа из корзины через OrderProcessOrchestrator
   */
  async createOrder(
    authedCustomer: AuthenticatedUser, 
    dto: CreateOrderDto
  ): Promise<OrderCreatedResponseDto> {
    try {
      const customer = await this.customerPort.getCustomer(
        new CustomerQueries.GetCustomerQuery({ customerId: authedCustomer.id })
      );
      if (!customer) throw new NotFoundException('Клиент не найден');

      const address = await this.addressesPort.getAddress(dto.customerAddressId);
      if (!address) throw new BadRequestException('Адрес доставки не найден');

      const deliveryAddress = {
        id: address._id.toString(),
        latitude: address.latitude,
        longitude: address.longitude,
        city: address.city,
        street: address.street,
        house: address.house,
        apartment: address.apartment,
        floor: address.floor,
        entrance: address.entrance,
        intercomCode: address.intercomCode,
      };

      const checkoutInput: CheckoutInput = {
        customerId: authedCustomer.id,
        customerName: customer.customerName,
        shopId: dto.shopId,
        deliveryAddress,
        customerComment: dto.comment,
        useBonusPoints: dto.usedBonusPoints,
      };

      const result = await this.orderProcess.checkout(checkoutInput);

      return plainToInstance(OrderCreatedResponseDto, { 
        orderId: result.orderId 
      }, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Ресурс не найден'),
        [DomainErrorCode.VALIDATION]: new BadRequestException('Ошибка валидации'),
        [DomainErrorCode.INVARIANT]: new ConflictException('Невозможно создать заказ'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка создания заказа'),
      });
    }
  }

  /**
   * Получение полной информации о заказе
   */
  async getFullOrder(
    authedCustomer: AuthenticatedUser, 
    orderId: string
  ): Promise<OrderFullResponseDto> {
    try {
      const hasAccess = await this.accessPort.canCustomerAccessOrder(authedCustomer.id, orderId);
      if (!hasAccess) throw new ForbiddenException('У вас нет доступа к этому заказу');

      const order = await this.orderPort.getOrder(
        new OrderQueries.GetOrderQuery(orderId, { populateProducts: true })
      );
      if (!order) throw new NotFoundException(`Заказ не найден`);

      return plainToInstance(OrderFullResponseDto, order, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Заказ не найден'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID заказа'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка получения заказа'),
      });
    }
  }

  /**
   * Отмена заказа клиентом
   */
  async cancelOrder(
    authedCustomer: AuthenticatedUser, 
    orderId: string, 
    dto: CancelOrderDto
  ): Promise<OrderFullResponseDto> {
    try {
      const hasAccess = await this.accessPort.canCustomerAccessOrder(authedCustomer.id, orderId);
      if (!hasAccess) throw new ForbiddenException('У вас нет доступа к этому заказу');

      const customer = await this.customerPort.getCustomer(
        new CustomerQueries.GetCustomerQuery({ customerId: authedCustomer.id })
      );
      if (!customer) throw new NotFoundException('Клиент не найден');

      const cancelInput: CancelOrderInput = {
        orderId,
        reason: dto.cancelReason,
        canceledBy: {
          type: 'customer',
          id: authedCustomer.id,
          name: customer.customerName,
        },
        comment: dto.cancelComment,
      };

      await this.orderProcess.cancelOrder(cancelInput);

      return this.getFullOrder(authedCustomer, orderId);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Заказ не найден'),
        [DomainErrorCode.INVARIANT]: new ConflictException('Невозможно отменить заказ'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка отмены заказа'),
      });
    }
  }

  /**
   * Получение списка всех заказов клиента
   */
  async getOrders(authedCustomer: AuthenticatedUser): Promise<OrderPreviewResponseDto[]> {
    try {
      const result = await this.orderPort.getOrders(
        new OrderQueries.GetOrdersQuery({ customerId: authedCustomer.id }),
        { sort: { createdAt: -1 } }
      );

      return result.docs.map(order => 
        plainToInstance(OrderPreviewResponseDto, order, { excludeExtraneousValues: true })
      );
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка получения заказов'),
      });
    }
  }

  /**
   * Получение активных заказов клиента
   */
  async getActiveOrders(authedCustomer: AuthenticatedUser): Promise<OrderFullResponseDto[]> {
    try {
      const activeStatuses = [
        OrderEnums.OrderStatus.PENDING,
        OrderEnums.OrderStatus.ASSEMBLING,
        OrderEnums.OrderStatus.AWAITING_COURIER,
        OrderEnums.OrderStatus.IN_DELIVERY,
      ];

      const result = await this.orderPort.getOrders(
        new OrderQueries.GetOrdersQuery(
          { customerId: authedCustomer.id, statuses: activeStatuses },
          { populateProducts: true }
        ),
        { sort: { createdAt: -1 } }
      );

      return result.docs.map(order => 
        plainToInstance(OrderFullResponseDto, order, { excludeExtraneousValues: true })
      );
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка получения заказов'),
      });
    }
  }

  /**
   * Оценка заказа клиентом
   */
  async setRating(
    authedCustomer: AuthenticatedUser, 
    orderId: string, 
    dto: RateTheOrderDto
  ): Promise<RateTheOrderResponseDto> {
    try {
      const hasAccess = await this.accessPort.canCustomerAccessOrder(authedCustomer.id, orderId);
      if (!hasAccess) throw new ForbiddenException('У вас нет доступа к этому заказу');

      const customer = await this.customerPort.getCustomer(
        new CustomerQueries.GetCustomerQuery({ customerId: authedCustomer.id })
      );
      if (!customer) throw new NotFoundException('Клиент не найден');

      const ratingInput: SetRatingInput = {
        orderId,
        customerId: authedCustomer.id,
        customerName: customer.customerName,
        rating: dto.settedRating,
        tags: dto.feedbackTags,
        comment: dto.feedbackComment,
      };

      await this.orderProcess.setRating(ratingInput);

      const updatedOrder = await this.orderPort.getOrder(
        new OrderQueries.GetOrderQuery(orderId)
      );

      return plainToInstance(RateTheOrderResponseDto, updatedOrder?.rating, { 
        excludeExtraneousValues: true 
      });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Заказ не найден'),
        [DomainErrorCode.INVARIANT]: new ConflictException('Невозможно оценить заказ'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка оценки заказа'),
      });
    }
  }
}