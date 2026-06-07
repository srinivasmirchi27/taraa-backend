import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Extends Passport JWT guard.
// - Protected routes: require a valid token (default behaviour).
// - @Public() routes: OPTIONAL auth — still run the JWT strategy so a token, if
//   present, populates req.user (e.g. a logged-in customer placing an order, so
//   the order is linked to their account), but never reject when it's absent.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  canActivate(context: ExecutionContext) {
    // Always run the strategy (even on public routes) so a present token is decoded.
    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    if (this.isPublic(context)) {
      // Optional auth: attach the user if the token was valid, else proceed as guest.
      return user || undefined;
    }
    if (err || !user) throw err || new UnauthorizedException();
    return user;
  }
}
