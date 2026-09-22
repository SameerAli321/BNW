import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps every successful controller response in the contract's envelope: { data }.
 * If a controller already returns a shape like { data, meta } (or { data }), it is passed through
 * unchanged so pagination metadata etc. survives.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result) => {
        if (result && typeof result === 'object' && 'data' in result) {
          return result;
        }
        return { data: result === undefined ? null : result };
      }),
    );
  }
}
