import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'

import { AuthStrategy } from '@app/constants/auth'
import { ValidateUserRequest } from '@app/types/Auth'
import { TokenService } from '../services/token.service'

@Injectable()
export class EmailStrategy extends PassportStrategy(Strategy, AuthStrategy.email) {
  constructor(private tokenService: TokenService) {
    super({ usernameField: 'email' })
  }

  public async validate(email: Required<ValidateUserRequest>['email'], password: ValidateUserRequest['password']) {
    return this.tokenService.validateUser({ email, password })
  }
}
