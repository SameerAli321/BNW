import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { join } from 'path';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  /** Set for inline images referenced as <img src="cid:..."> in the HTML. */
  cid?: string;
}

export interface MailMessage {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
  /** A calendar invite (.ics text) — sent as a proper calendar part so mail apps offer "Add". */
  icalEvent?: { method: 'REQUEST' | 'CANCEL'; content: string };
}

/**
 * - SENT: the SMTP server accepted it.
 * - FAILED: SMTP is set up but the send errored (see `error`).
 * - NOT_CONFIGURED: no SMTP settings in .env — the email was only written to the console.
 */
export type MailResult =
  | { status: 'SENT'; messageId: string }
  | { status: 'FAILED'; error: string }
  | { status: 'NOT_CONFIGURED' };

/** The BNW logo, embedded in every email as an inline image (cid:bnw-logo). */
export const EMAIL_LOGO_CID = 'bnw-logo';
const EMAIL_LOGO_PATH = join(process.cwd(), 'assets', 'email', 'bnw-logo.png');

/**
 * Sends real email over SMTP (BNW's own mail server — settings in .env: SMTP_HOST, SMTP_PORT,
 * SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM, optional MAIL_REPLY_TO). When the settings are
 * missing it falls back to logging the email to the console, so development never breaks.
 * `send()` never throws — callers record the returned status instead.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;
  private readonly replyTo: string | undefined;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 465);
    // Port 465 = SSL from the first byte ("secure"); 587 = STARTTLS. Default from the port.
    const secureSetting = this.config.get<string>('SMTP_SECURE');
    const secure = secureSetting ? secureSetting === 'true' : port === 465;

    this.from =
      this.config.get<string>('MAIL_FROM') || (user ? `BNW Chartered Accountants <${user}>` : '');
    this.replyTo = this.config.get<string>('MAIL_REPLY_TO') || undefined;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 15_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
      });
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('SMTP is not configured — emails will be written to the console only.');
      return;
    }
    // Check the login once at startup so a wrong password shows up in the log immediately —
    // without blocking the app from starting.
    this.transporter
      .verify()
      .then(() => this.logger.log(`SMTP ready — sending as ${this.from}`))
      .catch((error: Error) => this.logger.error(`SMTP check failed: ${error.message}`));
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  /** Just the address part of MAIL_FROM, e.g. for a calendar invite's ORGANIZER. */
  fromAddress(): string {
    const match = this.from.match(/<([^>]+)>/);
    return (match ? match[1] : this.from).trim();
  }

  fromHeader(): string {
    return this.from;
  }

  /** Absolute link into the web app (CLIENT_URL + path) for buttons in emails. */
  appUrl(path: string): string {
    const base = (this.config.get<string>('CLIENT_URL') || 'http://localhost:8080').replace(
      /\/+$/,
      '',
    );
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async verify(): Promise<{ ok: boolean; error?: string }> {
    if (!this.transporter) return { ok: false, error: 'SMTP is not configured in Backend/.env' };
    try {
      await this.transporter.verify();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async send(message: MailMessage): Promise<MailResult> {
    const recipients = [message.to, message.cc].flat().filter(Boolean).join(', ');
    if (!this.transporter) {
      this.logger.log(
        `[email not sent — SMTP not configured] "${message.subject}" -> ${recipients}`,
      );
      return { status: 'NOT_CONFIGURED' };
    }

    const attachments: nodemailer.SendMailOptions['attachments'] = (message.attachments ?? []).map(
      (a) => ({ filename: a.filename, content: a.content, contentType: a.contentType, cid: a.cid }),
    );
    if (message.html.includes(`cid:${EMAIL_LOGO_CID}`) && existsSync(EMAIL_LOGO_PATH)) {
      attachments.push({ filename: 'bnw-logo.png', path: EMAIL_LOGO_PATH, cid: EMAIL_LOGO_CID });
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        replyTo: this.replyTo,
        to: message.to,
        cc: message.cc,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments,
        icalEvent: message.icalEvent
          ? {
              method: message.icalEvent.method,
              content: message.icalEvent.content,
              filename: 'invite.ics',
            }
          : undefined,
      });
      this.logger.log(`Email sent: "${message.subject}" -> ${recipients}`);
      return { status: 'SENT', messageId: info.messageId };
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      this.logger.error(`Email failed: "${message.subject}" -> ${recipients}: ${text}`);
      return { status: 'FAILED', error: text };
    }
  }
}
