import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { IsEmail } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { MailService } from './mail.service';
import { renderEmailLayout, BRAND } from './email-layout';

class SendTestEmailDto {
  @IsEmail()
  to: string;
}

@Controller('mail')
export class MailController {
  constructor(private readonly mail: MailService) {}

  // HR / ADMIN — so the hiring screens can say whether invitations will really be emailed.
  @Roles(RoleName.HR, RoleName.ADMIN)
  @Get('status')
  async status() {
    const configured = this.mail.isConfigured();
    const check = configured ? await this.mail.verify() : { ok: false };
    return {
      configured,
      connected: check.ok,
      error: configured && !check.ok ? (check.error ?? null) : null,
      from: configured ? this.mail.fromHeader() : null,
    };
  }

  // ADMIN — send a test message to check the SMTP settings before emailing candidates.
  @Roles(RoleName.ADMIN)
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async test(@Body() dto: SendTestEmailDto) {
    return this.mail.send({
      to: dto.to,
      subject: 'BNW OMS — test email',
      text: 'This is a test email from the BNW HR system. If you can read this, email is working.',
      html: renderEmailLayout({
        preheader: 'Email from the BNW HR system is working.',
        heading: 'Email is working',
        badge: { label: 'Test', color: BRAND.blue },
        bodyHtml:
          '<p style="margin:0 0 14px;">This is a test email from the BNW HR system.</p>' +
          '<p style="margin:0 0 14px;">If you can read this, interview invitations and other system emails will be delivered.</p>',
      }),
    });
  }
}
