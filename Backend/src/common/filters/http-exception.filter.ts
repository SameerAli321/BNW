import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Converts any thrown exception into the contract's error envelope:
 * { error: { code, message, details? } }.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: ErrorBody = { code: 'SERVER_ERROR', message: 'Something went wrong' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        error = { code: this.codeForStatus(status), message: body };
      } else if (typeof body === 'object' && body !== null) {
        const anyBody = body as Record<string, unknown>;
        // class-validator ValidationPipe errors land here as { message: string[] | string, ... }
        const message = Array.isArray(anyBody.message)
          ? (anyBody.message as string[]).join('; ')
          : ((anyBody.message as string) ?? this.codeForStatus(status));
        error = {
          code: (anyBody.code as string) ?? this.codeForStatus(status),
          message,
          details: Array.isArray(anyBody.message) ? anyBody.message : undefined,
        };
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      error = { code: 'SERVER_ERROR', message: exception.message };
    } else {
      this.logger.error('Unknown exception', JSON.stringify(exception));
    }

    response.status(status).json({ error });
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHENTICATED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'SERVER_ERROR';
    }
  }
}
