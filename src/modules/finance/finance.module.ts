import { Module } from "@nestjs/common";
import { ShopAccountModule } from "./shop-account/shop-account.module";
import { PenaltyModule } from "./penalty/penalty.module";
import { RefundModule } from "./refund/refund.module";
import { OrderPaymentModule } from "./order-payment/order-payment.module";

@Module({
  imports: [
    ShopAccountModule,
    PenaltyModule,
    RefundModule,
    OrderPaymentModule
  ],
  exports: [
    ShopAccountModule,
    PenaltyModule,
    RefundModule,
    OrderPaymentModule
  ],
})
export class FinanceModule {}
