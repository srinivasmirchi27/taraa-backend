import Razorpay = require('razorpay');
import { ConfigService } from '@nestjs/config';

export const RAZORPAY = 'RAZORPAY';

export const RazorpayProvider = {
  provide: RAZORPAY,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    return new Razorpay({
      key_id: config.get<string>('RAZORPAY_KEY_ID'),
      key_secret: config.get<string>('RAZORPAY_KEY_SECRET'),
    });
  },
};
