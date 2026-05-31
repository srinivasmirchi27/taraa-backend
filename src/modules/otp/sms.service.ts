import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: string;

  constructor(private readonly config: ConfigService) {
    this.provider = config.get<string>('SMS_PROVIDER', 'none');
  }

  async send(phone: string, otp: string): Promise<void> {
    switch (this.provider) {
      case 'msg91':
        return this.sendViaMSG91(phone, otp);
      case 'fast2sms':
        return this.sendViaFast2SMS(phone, otp);
      default:
        // Development fallback — log to console
        this.logger.warn(`[SMS] OTP for ${phone}: ${otp}  (set SMS_PROVIDER in .env to enable real SMS)`);
    }
  }

  // ── MSG91 ──────────────────────────────────────────────────────────────────
  // Setup: https://msg91.com → API → OTP API → Create template
  // Template must contain {{otp}} placeholder
  private async sendViaMSG91(phone: string, otp: string): Promise<void> {
    const authKey    = this.config.get<string>('MSG91_AUTH_KEY');
    const templateId = this.config.get<string>('MSG91_TEMPLATE_ID');
    const senderId   = this.config.get<string>('MSG91_SENDER_ID', 'TARAA');

    if (!authKey || !templateId) {
      this.logger.error('MSG91_AUTH_KEY or MSG91_TEMPLATE_ID not set');
      this.logger.warn(`[SMS fallback] OTP for ${phone}: ${otp}`);
      return;
    }

    // Strip country code prefix for MSG91 (expects 10-digit Indian number)
    const mobile = phone.replace(/^\+91/, '').replace(/\s/g, '');

    const body = JSON.stringify({
      template_id: templateId,
      mobile,
      authkey: authKey,
      otp,
      sender: senderId,
    });

    try {
      const res = await fetch('https://api.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: authKey,
        },
        body,
      });

      const json = await res.json() as any;
      if (json.type !== 'success') {
        this.logger.error(`MSG91 error: ${JSON.stringify(json)}`);
      } else {
        this.logger.log(`MSG91 OTP sent to ${phone}`);
      }
    } catch (err: any) {
      this.logger.error(`MSG91 request failed: ${err.message}`);
    }
  }

  // ── Fast2SMS ───────────────────────────────────────────────────────────────
  // Setup: https://www.fast2sms.com → Developer → API key
  // New API (requires OTP template): set FAST2SMS_OTP_ID in .env
  // Old API (no template needed): used as fallback when FAST2SMS_OTP_ID is unset
  private async sendViaFast2SMS(phone: string, otp: string): Promise<void> {
    const apiKey = this.config.get<string>('FAST2SMS_API_KEY');
    const otpId  = this.config.get<string>('FAST2SMS_OTP_ID');

    if (!apiKey) {
      this.logger.error('FAST2SMS_API_KEY not set');
      this.logger.warn(`[SMS fallback] OTP for ${phone}: ${otp}`);
      return;
    }

    const mobile = phone.replace(/^\+91/, '').replace(/\s/g, '');

    try {
      let res: Response;

      if (otpId) {
        // New API — POST /dev/otp/send (requires DLT template ID)
        res = await fetch('https://www.fast2sms.com/dev/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', authorization: apiKey },
          body: JSON.stringify({ mobile, otp_id: otpId, otp }),
        });
      } else {
        // Old bulk API — GET /dev/bulkV2 (no template needed)
        const params = new URLSearchParams({ variables_values: otp, route: 'otp', numbers: mobile });
        res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`, {
          method: 'GET',
          headers: { authorization: apiKey },
        });
      }

      const json = await res.json() as any;
      if (!json.return) {
        this.logger.error(`Fast2SMS error: ${JSON.stringify(json)}`);
      } else {
        this.logger.log(`Fast2SMS OTP sent to ${phone}`);
      }
    } catch (err: any) {
      this.logger.error(`Fast2SMS request failed: ${err.message}`);
    }
  }
}
