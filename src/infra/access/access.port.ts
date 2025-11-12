export const ACCESS_PORT = 'ACCESS_PORT';

export interface AccessPort {
  // ========== Seller Access Checks ==========
  
  /**
   * Проверяет, может ли продавец получить доступ к магазину
   * @returns true если магазин принадлежит продавцу, false в противном случае
   */
  canSellerAccessShop(sellerId: string, shopId: string): Promise<boolean>;

  /**
   * Проверяет, может ли продавец получить доступ к продукту (через магазин)
   * @returns true если продукт принадлежит продавцу через магазин, false в противном случае
   */
  canSellerAccessProduct(sellerId: string, productId: string): Promise<boolean>;

  /**
   * Проверяет, может ли продавец получить доступ к смене (через магазин)
   * @returns true если смена принадлежит продавцу через магазин, false в противном случае
   */
  canSellerAccessShift(sellerId: string, shiftId: string): Promise<boolean>;

  /**
   * Проверяет доступ продавца к нескольким магазинам за один запрос
   * @returns true если все магазины принадлежат продавцу, false если хотя бы один не принадлежит
   */
  canSellerAccessShops(sellerId: string, shopIds: string[]): Promise<boolean>;

  // ========== Shop Access Checks ==========

  /**
   * Проверяет, принадлежит ли смена магазину
   * @returns true если смена принадлежит магазину, false в противном случае
   */
  canShopAccessShift(shopId: string, shiftId: string): Promise<boolean>;

  /**
   * Проверяет, принадлежит ли продукт магазину
   * @returns true если продукт принадлежит магазину, false в противном случае
   */
  canShopAccessProduct(shopId: string, productId: string): Promise<boolean>;

  // ========== Customer Access Checks ==========

  /**
   * Проверяет, принадлежит ли заказ клиенту
   * @returns true если заказ принадлежит клиенту, false в противном случае
   */
  canCustomerAccessOrder(customerId: string, orderId: string): Promise<boolean>;

  /**
   * Проверяет, принадлежит ли адрес клиенту
   * @returns true если адрес принадлежит клиенту, false в противном случае
   */
  canCustomerAccessAddress(customerId: string, addressId: string): Promise<boolean>;

  // ========== Helper Methods ==========

  /**
   * Проверяет доступ и возвращает магазин если доступ разрешён
   * @returns Shop entity или null если доступ запрещён
   */
  getShopIfSellerHasAccess(sellerId: string, shopId: string): Promise<any | null>;

  /**
   * Проверяет доступ и возвращает продукт если доступ разрешён
   * @returns Product entity или null если доступ запрещён
   */
  getProductIfSellerHasAccess(sellerId: string, productId: string): Promise<any | null>;

  /**
   * Проверяет доступ и возвращает смену если доступ разрешён
   * @returns Shift entity или null если доступ запрещён
   */
  getShiftIfSellerHasAccess(sellerId: string, shiftId: string): Promise<any | null>;

  /**
   * Проверяет доступ и возвращает заказ если доступ разрешён
   * @returns Order entity или null если доступ запрещён
   */
  getOrderIfCustomerHasAccess(customerId: string, orderId: string): Promise<any | null>;
}
