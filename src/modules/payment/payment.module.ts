import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { RazorpayProvider } from './razorpay.provider';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentController],
  providers: [PaymentService, RazorpayProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
