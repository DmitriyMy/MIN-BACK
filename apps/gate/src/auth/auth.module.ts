import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { AUTH_QUEUE } from '@app/constants/auth'
import { RpcModule } from '@app/infrastructure'

import { IAuthService } from '@app/types/Auth'

import { AuthController } from './controllers/auth.controller'
import { TokenService } from './services/token.service'
import { EmailStrategy } from './utils/email.strategy'
import { JwtStrategy } from './utils/jwt.strategy'

@Module({
  imports: [
    RpcModule.register({ name: IAuthService, queueName: AUTH_QUEUE }),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_AUTH_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_AUTH_EXPIRE') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [TokenService, JwtStrategy, EmailStrategy],
})
export class AuthModule {}
