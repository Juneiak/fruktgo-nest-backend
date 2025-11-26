/**
 * Entity Response Schemas
 *
 * Базовые интерфейсы для ответов, привязанные к DB Schema.
 * Проекции и DTOs создаются в роль-папках.
 *
 * @example
 * import { ICustomerResponse } from 'src/interface/http/response-schemas';
 *
 * type MyProjection = Pick<ICustomerResponse, 'customerId' | 'customerName'>;
 */

export * from './article.base-response';
export * from './customer.base-response';
export * from './employee.base-response';
export * from './issue.base-response';
export * from './product.base-response';
export * from './seller.base-response';
export * from './shift.base-response';
export * from './shop.base-response';
export * from './shop-product.base-response';
