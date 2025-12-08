import { Inject, Injectable } from '@nestjs/common'

import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'
import { IUser } from '@app/types/User'

@Injectable()
export class VerificationService {
  @Inject(ConfigService)
  private config: ConfigService

  public getEmailToken(userId: IUser['id']): string {
    return jwt.sign({ id: userId }, this.config.get('JWT_EMAIL_SECRET')!, {
      expiresIn: this.config.get('JWT_EMAIL_EXPIRE'),
      algorithm: 'HS256',
    })
  }

  public verifyEmailToken(token: string): { id: IUser['id'] } {
    return jwt.verify(token, this.config.get('JWT_EMAIL_SECRET')!, {
      algorithms: ['HS256'],
    }) as { id: IUser['id'] }
  }
}
