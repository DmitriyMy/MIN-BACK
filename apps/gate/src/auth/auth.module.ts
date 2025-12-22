import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { AUTH_QUEUE } from '@app/constants/auth'
import { RpcModule } from '@app/infrastructure'

import { IAuthService } from '@app/types/Auth'

import { UserRpcModule } from '../user/user-rpc.module'
import { AuthController } from './controllers/auth.controller'
import { TokenService } from './services/token.service'
import { EmailStrategy, JwtAuthGuard } from './utils'
import { JwtStrategy } from './utils/jwt.strategy'

@Module({
  imports: [
    RpcModule.register({ name: IAuthService, queueName: AUTH_QUEUE }),
    UserRpcModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>('JWT_AUTH_EXPIRE')!
        return {
          secret: configService.get<string>('JWT_AUTH_SECRET')!,
          // @ts-expect-error - expiresIn is string but JwtModuleOptions expects StringValue, which is compatible
          signOptions: { expiresIn },
        }
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [TokenService, JwtStrategy, EmailStrategy, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
