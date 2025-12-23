import { Body, Controller, Inject, Logger, Post, VERSION_NEUTRAL } from '@nestjs/common'

import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { commonError, userError } from '@app/errors'
import { IAuthService, SignInSuccessResponse, SignUpSuccessResponse } from '@app/types/Auth'
import { ISuccessResponse } from '@app/types/Service'
import { IUserDB } from '@app/types/User'

import { getData } from '@app/utils/service'
import * as DTO from '../dto'
import { TokenService } from '../services/token.service'
import { Public } from '../utils/auth.guards'

@ApiTags('AuthController')
@Controller({ version: VERSION_NEUTRAL, path: 'auth' })
export class AuthController {
  private logger = new Logger(AuthController.name)

  @Inject(IAuthService)
  private readonly authService: IAuthService

  @Inject(TokenService)
  private readonly tokenService: TokenService

  @Public()
  @Post('signUp')
  @ApiOperation({ summary: 'Sign up user' })
  @ApiBody({ type: DTO.SignUpDtoRequest })
  @ApiConflictResponse({
    description: 'Errors caused by problems on the part of the userMicroservice',
    schema: { examples: [userError.USER_ALREADY_EXIST] },
  })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  public async signUpUser(@Body() body: DTO.SignUpDtoRequest): Promise<SignUpSuccessResponse> {
    const response = await this.authService.signUpUser(body)

    const { email } = getData(response).data
    return { email, success: !!email }
  }

  @Public()
  @Post('signIn')
  @ApiOperation({ summary: 'Sign in user' })
  @ApiBody({ type: DTO.SignInDtoRequest })
  @ApiNoContentResponse({ description: 'Data not found' })
  @ApiConflictResponse({
    description: 'Errors caused by problems on the part of the userMicroservice',
    schema: { examples: [userError.USER_ALREADY_EXIST] },
  })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  public async signInUser(@Body() body: DTO.SignInDtoRequest): Promise<SignInSuccessResponse> {
    const response = await this.authService.signInUser(body)

    const { user }: Record<string, IUserDB> = getData(response).data
    const token = this.tokenService.getToken(user)
    return { token }
  }

  @Public()
  @Post('password/restore')
  @ApiOperation({ summary: 'Password recovery' })
  @ApiBody({ type: DTO.RestorePasswordDtoRequest })
  @ApiBadRequestResponse({
    description: 'Errors сaused by problems on the part of the userMicroservice',
    schema: { examples: [userError.CODE_WRONG] },
  })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  public async restorePassword(@Body() body: DTO.RestorePasswordDtoRequest): Promise<ISuccessResponse> {
    const response = await this.authService.restorePassword(body)

    getData(response)

    return { success: true }
  }
}
