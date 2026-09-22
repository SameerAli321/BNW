import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUserPayload {
  sub: number;
  role: string;
  email: string;
}

/**
 * Extracts the authenticated user's JWT payload ({ sub, role, email }) set by JwtAuthGuard.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtUserPayload = request.user;
    return data ? user?.[data] : user;
  },
);
