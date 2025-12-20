import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'

import {
  IAuthService,
  ISignInUserRequest,
  ISignUpUserRequest,
  RestorePasswordRequest,
  SignUpUserResponse,
} from '@app/types/Auth'
import { EmptyResponse, ServiceResponse } from '@app/types/Service'
import { SingleUserResponse } from '@app/types/User'

import * as DTO from '../dto'
import { AuthService } from '../services/auth.service'

@Controller()
export class AuthController implements Pick<IAuthService, 'signUpUser' | 'signInUser' | 'restorePassword'> {
  private logger = new Logger(AuthController.name)

  @Inject(AuthService)
  private readonly authService: AuthService

  @MessagePattern('signUpUser')
  public async signUpUser(@Payload() payload: DTO.SignUpUserRequestDto): ServiceResponse<SignUpUserResponse> {
    this.logger.debug({ '[signUpUser]': { payload } })
    const response = await this.authService.signUpUser(payload as ISignUpUserRequest)
    this.logger.debug({ '[signUpUser]': { response } })
    return response
  }

  @MessagePattern('signInUser')
  public async signInUser(@Payload() payload: DTO.SignInUserRequestDto): ServiceResponse<SingleUserResponse> {
    this.logger.debug({ '[signInUser]': { payload } })
    const response = await this.authService.signInUser(payload as ISignInUserRequest)
    this.logger.debug({ '[signInUser]': { response } })
    return response
  }

  @MessagePattern('restorePassword')
  public async restorePassword(@Payload() payload: DTO.RestorePasswordRequestDto): ServiceResponse<EmptyResponse> {
    this.logger.debug({ '[restorePassword]': { payload } })
    const response = await this.authService.restorePassword(payload as RestorePasswordRequest)
    this.logger.debug({ '[restorePassword]': { response } })
    return response
  }
}
