import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';

// Global so any module can inject MailService without importing MailModule explicitly
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
