import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Public } from '../../decorators/public.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // POST /api/v1/payments/initiate
  // Creates the app order + Razorpay order in one shot.
  // Guest users are allowed (no JWT required).
  @Public()
  @Post('initiate')
  @ApiOperation({
    summary: 'Initiate Razorpay checkout — returns razorpayOrderId + keyId for the popup',
  })
  initiateCheckout(@Body() dto: InitiatePaymentDto, @CurrentUser() user?: any) {
    return this.paymentService.initiateCheckout(dto, user?.id);
  }

  // POST /api/v1/payments/verify
  // Call this after the Razorpay checkout popup closes with a successful payment.
  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment signature and mark order as paid' })
  verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(dto);
  }

  // POST /api/v1/payments/webhook
  // Register this URL in Razorpay Dashboard → Webhooks.
  // Needs the raw request body — ensure rawBody:true is set in main.ts.
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook endpoint (server-side payment confirmation)' })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    if (!req.rawBody) throw new BadRequestException('Raw body unavailable');
    return this.paymentService.handleWebhook(req.rawBody, signature);
  }

  // POST /api/v1/payments/refund/:paymentId
  // Admin only. Optionally pass { amount } in body for partial refund.
  @Post('refund/:paymentId')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Initiate full or partial refund (admin only)' })
  refund(
    @Param('paymentId') paymentId: string,
    @Body('amount') amount?: number,
  ) {
    return this.paymentService.refundPayment(paymentId, amount);
  }
}
