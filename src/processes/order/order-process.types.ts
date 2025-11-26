import { OrderEventSource } from 'src/modules/order/order.enums';
import { Address } from 'src/common/schemas/common-schemas';

// ====================================================
// CHECKOUT TYPES
// ====================================================

export interface CheckoutInput {
  customerId: string;
  customerName: string;
  shopId: string;
  deliveryAddress: Address;
  customerComment?: string;
  useBonusPoints?: number;
  source?: OrderEventSource;
}

export interface CheckoutResult {
  orderId: string;
  orderStatus: string;
  totalSum: number;
  deliveryPrice: number;
  estimatedDeliveryTime: number;
  products: Array<{
    shopProductId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
}

// ====================================================
// ASSEMBLY TYPES
// ====================================================

export interface AcceptOrderInput {
  orderId: string;
  employeeId: string;
  employeeName: string;
}

export interface CompleteAssemblyInput {
  orderId: string;
  employeeId: string;
  employeeName: string;
  actualProducts: Array<{
    shopProductId: string;
    actualQuantity: number;
  }>;
}

export interface AssemblyResult {
  orderId: string;
  orderStatus: string;
  totalWeightCompensationBonus: number;
  adjustedTotalSum: number;
}

// ====================================================
// DELIVERY TYPES
// ====================================================

export interface HandToCourierInput {
  orderId: string;
  employeeId: string;
  employeeName: string;
  courierInfo?: string;
}

export interface DeliverOrderInput {
  orderId: string;
}

export interface DeliveryResult {
  orderId: string;
  orderStatus: string;
  deliveredAt: Date;
}

// ====================================================
// CANCEL/DECLINE TYPES
// ====================================================

export interface CancelOrderInput {
  orderId: string;
  reason: string;
  canceledBy: {
    type: 'customer' | 'employee' | 'admin';
    id: string;
    name: string;
  };
  comment?: string;
}

export interface DeclineOrderInput {
  orderId: string;
  reason: string;
  declinedBy: {
    type: 'employee' | 'admin';
    id: string;
    name: string;
  };
  comment?: string;
}

// ====================================================
// RATING TYPES
// ====================================================

export interface SetRatingInput {
  orderId: string;
  customerId: string;
  customerName: string;
  rating: number;
  tags?: string[];
  comment?: string;
}

// ====================================================
// WEIGHT COMPENSATION
// ====================================================

export interface WeightCompensationResult {
  shopProductId: string;
  selectedQuantity: number;
  actualQuantity: number;
  priceDifference: number;
  bonusPoints: number;
  compensationType: 'underweight' | 'overweight' | 'exact';
}

// ====================================================
// ORCHESTRATOR OPTIONS
// ====================================================

export interface OrderProcessOptions {
  skipStockValidation?: boolean;
  skipShiftValidation?: boolean;
}
