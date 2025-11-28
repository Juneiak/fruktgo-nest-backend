import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { OrderPayment, OrderPaymentStatus, YooKassaPaymentStatus } from './order-payment.schema';
import { DomainError } from 'src/common/errors';
import { 
  PLATFORM_ACCOUNT_PORT, 
  PlatformAccountPort 
} from '../platform-account/platform-account.port';
import { CreatePlatformTransactionCommand } from '../platform-account/platform-account.commands';
import { 
  PlatformAccountTransactionType, 
  PlatformAccountTransactionStatus 
} from '../platform-account/schemas/platform-account-transaction.schema';

/**
 * =====================================================
 * СЕРВИС ПЛАТЕЖЕЙ ЧЕРЕЗ ЮКАССУ
 * =====================================================
 * 
 * Отвечает за:
 * - Создание платежей в ЮKassa (двухшаговая оплата)
 * - Обработку webhook от ЮKassa
 * - Подтверждение (capture) и отмену платежей
 * - Возвраты (refunds)
 * 
 * Двухшаговая схема:
 * 1. Клиент оплачивает → деньги блокируются (waiting_for_capture)
 * 2. Магазин принимает заказ → capture (деньги списываются)
 * 3. Если заказ отменён до capture → cancel (деньги разблокируются)
 * 
 * @see docs/processes/payment-flow.md
 */

// Типы для работы с ЮKassa API
interface YooKassaPaymentRequest {
  amount: { value: string; currency: string };
  capture: boolean;
  confirmation: { type: string; return_url: string };
  description: string;
  receipt?: any;
  metadata?: Record<string, string>;
}

interface YooKassaPaymentResponse {
  id: string;
  status: string;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url: string };
  expires_at?: string;
  payment_method?: { type: string };
}

interface YooKassaWebhookPayload {
  type: string;
  event: string;
  object: {
    id: string;
    status: string;
    amount: { value: string; currency: string };
    payment_method?: { type: string };
    captured_at?: string;
    metadata?: Record<string, string>;
  };
}

@Injectable()
export class OrderPaymentService {
  private readonly shopId: string;
  private readonly secretKey: string;
  private readonly apiUrl = 'https://api.yookassa.ru/v3';

  constructor(
    @InjectModel(OrderPayment.name) private orderPaymentModel: Model<OrderPayment>,
    private readonly configService: ConfigService,
    @Inject(PLATFORM_ACCOUNT_PORT) private readonly platformAccountPort: PlatformAccountPort,
  ) {
    this.shopId = this.configService.get<string>('YOOKASSA_SHOP_ID') ?? '';
    this.secretKey = this.configService.get<string>('YOOKASSA_SECRET_KEY') ?? '';
  }

  /**
   * =====================================================
   * СОЗДАНИЕ ПЛАТЕЖА
   * =====================================================
   * 
   * 1. Создаём запись OrderPayment в статусе PENDING
   * 2. Отправляем запрос в ЮKassa API
   * 3. Получаем confirmation_url для перенаправления клиента
   * 
   * @param orderId - ID заказа
   * @param shopAccountId - ID счёта магазина
   * @param amount - Сумма платежа (₽)
   * @param returnUrl - URL для возврата клиента после оплаты
   * @param description - Описание платежа
   * @param receipt - Данные для чека (54-ФЗ)
   * @param metadata - Метаданные (orderId, shopId, customerId)
   */
  async createPayment(params: {
    orderId: string;
    shopAccountId: string;
    amount: number;
    returnUrl: string;
    description: string;
    receipt?: any;
    metadata?: Record<string, string>;
  }, session?: ClientSession): Promise<{ payment: OrderPayment; confirmationUrl: string }> {
    
    // 1. Создаём запись в БД
    const orderPayment = new this.orderPaymentModel({
      order: new Types.ObjectId(params.orderId),
      shopAccount: new Types.ObjectId(params.shopAccountId),
      amount: params.amount,
      status: OrderPaymentStatus.PENDING,
      yookassa: {
        paymentId: null,
        status: 'pending',
        paymentMethod: null,
        paid: false,
      },
    });

    const saveOptions: any = {};
    if (session) saveOptions.session = session;
    await orderPayment.save(saveOptions);

    // 2. Отправляем запрос в ЮKassa
    const yookassaRequest: YooKassaPaymentRequest = {
      amount: {
        value: params.amount.toFixed(2),
        currency: 'RUB',
      },
      capture: false, // Двухшаговая оплата
      confirmation: {
        type: 'redirect',
        return_url: params.returnUrl,
      },
      description: params.description,
      receipt: params.receipt,
      metadata: {
        orderId: params.orderId,
        paymentId: orderPayment._id.toString(),
        ...params.metadata,
      },
    };

    const yookassaResponse = await this.callYooKassaApi<YooKassaPaymentResponse>(
      'POST',
      '/payments',
      yookassaRequest,
    );

    // 3. Обновляем запись с данными от ЮKassa
    orderPayment.yookassa = {
      paymentId: yookassaResponse.id,
      status: yookassaResponse.status,
      paymentMethod: '',
      paid: false,
      expiresAt: yookassaResponse.expires_at ? new Date(yookassaResponse.expires_at) : undefined,
    };
    await orderPayment.save(saveOptions);

    return {
      payment: orderPayment,
      confirmationUrl: yookassaResponse.confirmation?.confirmation_url ?? '',
    };
  }

  /**
   * =====================================================
   * ОБРАБОТКА WEBHOOK ОТ ЮКАССЫ
   * =====================================================
   * 
   * События:
   * - payment.waiting_for_capture — платёж авторизован
   * - payment.succeeded — платёж подтверждён
   * - payment.canceled — платёж отменён
   * - refund.succeeded — возврат выполнен
   */
  async handleWebhook(payload: YooKassaWebhookPayload): Promise<void> {
    const { event, object } = payload;
    const paymentId = object.id;

    // Находим платёж по yookassa.paymentId
    const orderPayment = await this.orderPaymentModel.findOne({
      'yookassa.paymentId': paymentId,
    });

    if (!orderPayment) {
      // Логируем, но не кидаем ошибку (идемпотентность)
      console.warn(`[OrderPayment] Webhook: payment not found: ${paymentId}`);
      return;
    }

    // Проверка идемпотентности: если статус уже соответствует, пропускаем
    if (orderPayment.yookassa.status === object.status) {
      return;
    }

    switch (event) {
      case 'payment.waiting_for_capture':
        orderPayment.status = OrderPaymentStatus.WAITING_FOR_CAPTURE;
        orderPayment.yookassa.status = object.status;
        orderPayment.yookassa.paymentMethod = object.payment_method?.type ?? '';
        break;

      case 'payment.succeeded':
        orderPayment.status = OrderPaymentStatus.SUCCEEDED;
        orderPayment.yookassa.status = object.status;
        orderPayment.yookassa.paid = true;
        orderPayment.yookassa.capturedAt = object.captured_at
          ? new Date(object.captured_at)
          : new Date();
        break;

      case 'payment.canceled':
        orderPayment.status = OrderPaymentStatus.CANCELED;
        orderPayment.yookassa.status = object.status;
        break;

      case 'refund.succeeded':
        // Обновляем сумму возврата
        const refundAmount = parseFloat(object.amount.value);
        orderPayment.refundedAmount += refundAmount;
        orderPayment.yookassa.refundedAmount =
          (orderPayment.yookassa.refundedAmount ?? 0) + refundAmount;

        // Определяем статус: полный или частичный возврат
        if (orderPayment.refundedAmount >= orderPayment.amount) {
          orderPayment.status = OrderPaymentStatus.REFUNDED;
        } else {
          orderPayment.status = OrderPaymentStatus.PARTIALLY_REFUNDED;
        }
        break;

      default:
        console.warn(`[OrderPayment] Unknown webhook event: ${event}`);
        return;
    }

    await orderPayment.save();
  }

  /**
   * =====================================================
   * ПОДТВЕРЖДЕНИЕ ПЛАТЕЖА (CAPTURE)
   * =====================================================
   * 
   * Вызывается после принятия заказа магазином.
   * Деньги списываются с карты клиента.
   * 
   * При успешном capture:
   * - Обновляется статус платежа
   * - Создаётся транзакция ACQUIRING_INCOME на счёте платформы
   */
  async capturePayment(orderPaymentId: string, session?: ClientSession): Promise<OrderPayment> {
    const orderPayment = await this.orderPaymentModel.findById(orderPaymentId);
    if (!orderPayment) {
      throw DomainError.notFound('OrderPayment', orderPaymentId);
    }

    if (orderPayment.status !== OrderPaymentStatus.WAITING_FOR_CAPTURE) {
      throw DomainError.invariant(
        `Невозможно подтвердить платёж в статусе ${orderPayment.status}`,
      );
    }

    // Запрос в ЮKassa
    await this.callYooKassaApi(
      'POST',
      `/payments/${orderPayment.yookassa.paymentId}/capture`,
      {
        amount: {
          value: orderPayment.amount.toFixed(2),
          currency: 'RUB',
        },
      },
    );

    // Обновляем статус (финальное обновление придёт через webhook)
    orderPayment.status = OrderPaymentStatus.SUCCEEDED;
    orderPayment.yookassa.status = 'succeeded';
    orderPayment.yookassa.paid = true;
    orderPayment.yookassa.capturedAt = new Date();

    const saveOptions: any = {};
    if (session) saveOptions.session = session;
    await orderPayment.save(saveOptions);

    // Записываем поступление денег на счёт платформы (ACQUIRING_INCOME)
    try {
      await this.platformAccountPort.createTransaction(
        new CreatePlatformTransactionCommand({
          type: PlatformAccountTransactionType.ACQUIRING_INCOME,
          amount: orderPayment.amount,
          status: PlatformAccountTransactionStatus.COMPLETED,
          description: `Поступление от клиента`,
          references: {
            orderId: orderPayment.order.toString(),
            paymentId: orderPayment._id.toString(),
          },
        }),
        { session }
      );
    } catch (error) {
      // Логируем, но не откатываем capture — платёж уже списан в ЮKassa
      console.error('[OrderPayment] Failed to record ACQUIRING_INCOME:', error);
    }

    return orderPayment;
  }

  /**
   * =====================================================
   * ОТМЕНА ПЛАТЕЖА
   * =====================================================
   * 
   * Вызывается если заказ отменён до capture.
   * Деньги разблокируются на карте клиента.
   */
  async cancelPayment(orderPaymentId: string, session?: ClientSession): Promise<OrderPayment> {
    const orderPayment = await this.orderPaymentModel.findById(orderPaymentId);
    if (!orderPayment) {
      throw DomainError.notFound('OrderPayment', orderPaymentId);
    }

    // Можно отменить только pending или waiting_for_capture
    if (
      orderPayment.status !== OrderPaymentStatus.PENDING &&
      orderPayment.status !== OrderPaymentStatus.WAITING_FOR_CAPTURE
    ) {
      throw DomainError.invariant(
        `Невозможно отменить платёж в статусе ${orderPayment.status}`,
      );
    }

    // Если платёж уже создан в ЮKassa — отменяем там
    if (orderPayment.yookassa.paymentId) {
      await this.callYooKassaApi(
        'POST',
        `/payments/${orderPayment.yookassa.paymentId}/cancel`,
        {},
      );
    }

    orderPayment.status = OrderPaymentStatus.CANCELED;
    orderPayment.yookassa.status = 'canceled';

    const saveOptions: any = {};
    if (session) saveOptions.session = session;
    await orderPayment.save(saveOptions);

    return orderPayment;
  }

  /**
   * =====================================================
   * ВОЗВРАТ СРЕДСТВ
   * =====================================================
   * 
   * Полный или частичный возврат клиенту.
   * Обрабатывается ЮKassa за 1-7 дней.
   */
  async createRefund(params: {
    orderPaymentId: string;
    amount: number;
    reason?: string;
    receipt?: any;
  }, session?: ClientSession): Promise<string> {
    const orderPayment = await this.orderPaymentModel.findById(params.orderPaymentId);
    if (!orderPayment) {
      throw DomainError.notFound('OrderPayment', params.orderPaymentId);
    }

    if (orderPayment.status !== OrderPaymentStatus.SUCCEEDED) {
      throw DomainError.invariant('Возврат возможен только для оплаченных платежей');
    }

    const maxRefund = orderPayment.amount - orderPayment.refundedAmount;
    if (params.amount > maxRefund) {
      throw DomainError.validation(`Максимальная сумма возврата: ${maxRefund}₽`);
    }

    const response = await this.callYooKassaApi<{ id: string }>(
      'POST',
      '/refunds',
      {
        payment_id: orderPayment.yookassa.paymentId,
        amount: {
          value: params.amount.toFixed(2),
          currency: 'RUB',
        },
        receipt: params.receipt,
      },
    );

    // Добавляем ID возврата в references
    if (!orderPayment.references.refundIds) {
      orderPayment.references.refundIds = [];
    }
    orderPayment.references.refundIds.push(response.id);

    const saveOptions: any = {};
    if (session) saveOptions.session = session;
    await orderPayment.save(saveOptions);

    return response.id;
  }

  /**
   * =====================================================
   * ПОЛУЧЕНИЕ ПЛАТЕЖА
   * =====================================================
   */
  async getPaymentByOrderId(orderId: string): Promise<OrderPayment | null> {
    return this.orderPaymentModel.findOne({
      order: new Types.ObjectId(orderId),
    }).lean();
  }

  async getPaymentById(paymentId: string): Promise<OrderPayment | null> {
    return this.orderPaymentModel.findById(paymentId).lean();
  }

  /**
   * =====================================================
   * ВЫЗОВ YOOKASSA API
   * =====================================================
   */
  private async callYooKassaApi<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: any,
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': this.generateIdempotenceKey(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw DomainError.badRequest(`YooKassa API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  private generateIdempotenceKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
