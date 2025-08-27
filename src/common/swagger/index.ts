import { applyDecorators } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';

export const testSwaggerIds = {
  customerId: '67c27b1ecd8f2260e3b0ed48',
  shopId: '67c787e39e1f885cf2da7de6',
  employeeId: '550e8400-e29b-41d4-a716-446655440000',
  sellerId: '550e8400-e29b-41d4-a716-446655440000',
  orderId: '550e8400-e29b-41d4-a716-446655440000',
  productId: '550e8400-e29b-41d4-a716-446655440000',
  shopProductId: '550e8400-e29b-41d4-a716-446655440000',
  shiftId: '550e8400-e29b-41d4-a716-446655440000',
  imageId: '550e8400-e29b-41d4-a716-446655440000',
  requestToEmployeeId: '550e8400-e29b-41d4-a716-446655440000',
  issueId: '550e8400-e29b-41d4-a716-446655440000'
}

export const ApiCustomerIdParam = (customerId: string = testSwaggerIds.customerId) => {
  return applyDecorators(
    ApiParam({
      name: 'customerId',
      description: 'ID клиента',
      example: customerId
    })
  );
};

export const ApiShopIdParam = (shopId: string = testSwaggerIds.shopId) => {
  return applyDecorators(
    ApiParam({
      name: 'shopId',
      description: 'ID магазина',
      example: shopId
    })
  );
};

export const ApiEmployeeIdParam = (employeeId: string = testSwaggerIds.employeeId) => {
  return applyDecorators(
    ApiParam({
      name: 'employeeId',
      description: 'ID сотрудника',
      example: employeeId
    })
  );
};

export const ApiShopProductIdParam = (shopProductId: string = testSwaggerIds.shopProductId) => {
  return applyDecorators(
    ApiParam({
      name: 'shopProductId',
      description: 'ID товара в магазине',
      example: shopProductId
    })
  );
};

export const ApiSellerIdParam = (sellerId: string = testSwaggerIds.sellerId) => {
  return applyDecorators(
    ApiParam({
      name: 'sellerId',
      description: 'ID продавца',
      example: sellerId
    })
  );
};

export const ApiProductIdParam = (productId: string = testSwaggerIds.productId) => {
  return applyDecorators(
    ApiParam({
      name: 'productId',
      description: 'ID продукта',
      example: productId
    })
  );
};

export const ApiOrderIdParam = (orderId: string = testSwaggerIds.orderId) => {
  return applyDecorators(
    ApiParam({
      name: 'orderId',
      description: 'ID заказа',
      example: orderId
    })
  );
};

export const ApiShiftIdParam = (shiftId: string = testSwaggerIds.shiftId) => {
  return applyDecorators(
    ApiParam({
      name: 'shiftId',
      description: 'ID смены',
      example: shiftId
    })
  );
};

export const ApiImageIdParam = (imageId: string = testSwaggerIds.imageId) => {
  return applyDecorators(
    ApiParam({
      name: 'imageId',
      description: 'ID изображения',
      example: imageId
    })
  );
};

export const ApiRequestToEmployeeIdParam = (requestToEmployeeId: string = testSwaggerIds.requestToEmployeeId) => {
  return applyDecorators(
    ApiParam({
      name: 'requestToEmployeeId',
      description: 'ID запроса к сотруднику',
      example: requestToEmployeeId
    })
  );
};

export const ApiIssueIdParam = (issueId: string = testSwaggerIds.issueId) => {
  return applyDecorators(
    ApiParam({
      name: 'issueId',
      description: 'ID заявки',
      example: issueId
    })
  );
};