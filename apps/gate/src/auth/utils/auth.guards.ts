// Reason: need to store all guards' classes logic in one place
// eslint-disable-next-line max-classes-per-file
import { ExecutionContext, Injectable, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { AuthStrategy } from '@app/constants/auth'

export const IS_PUBLIC_KEY = 'isPublic'

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

@Injectable()
export class JwtAuthGuard extends AuthGuard(AuthStrategy.jwt) {
  constructor(private reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }
    // Note: also set "request.user" field
    return super.canActivate(context)
  }
}

@Injectable()
export class EmailAuthGuard extends AuthGuard(AuthStrategy.email) {}

@Injectable()
export class PhoneAuthGuard extends AuthGuard(AuthStrategy.phone) {}

@Injectable()
export class EmailOrPhoneAuthGuard extends AuthGuard([AuthStrategy.phone, AuthStrategy.email]) {}
