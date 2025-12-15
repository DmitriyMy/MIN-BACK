import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Logger,
  Param,
  Patch,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common'

import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import { commonError, userError } from '@app/errors'
import { IGetUserRequest, IUpdateUserRequest, IUserService, UserId } from '@app/types/User'
import { JwtAuthGuard, ReqUser } from '../../auth/utils'
import * as DTO from '../dto'

@ApiTags('UserController')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ version: VERSION_NEUTRAL, path: 'user' })
export class UserController {
  private logger = new Logger(UserController.name)

  @Inject(IUserService)
  private readonly userService: IUserService

  @Get()
  @ApiOperation({ summary: 'Get user data' })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async getUser(@ReqUser('userId') requestorId: UserId, @Param('userId') userId: UserId) {
    const requestData: IGetUserRequest = { userId }
    if (userId !== requestorId) {
      throw new ForbiddenException(commonError.DONT_ACCESS)
    }
    this.logger.debug({ '[getUser]': { requestData } })
    const response = await this.userService.getUser(requestData)
    this.logger.debug({ '[getUser]': { response } })
    return response
  }

  @Patch()
  @ApiOperation({ summary: 'Update user data' })
  @ApiBody({ type: DTO.UpdateUserDtoRequest })
  @ApiConflictResponse({
    description: 'Errors caused by problems on the part of the userMicroservice',
    schema: { examples: [userError.USER_NOT_FOUND] },
  })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async updateUser(
    @ReqUser('userId') requestorId: UserId,
    @Param('userId') userId: UserId,
    @Body() body: DTO.UpdateUserDtoRequest,
  ) {
    if (userId !== requestorId) {
      throw new ForbiddenException(commonError.DONT_ACCESS)
    }
    const requestData: IUpdateUserRequest = { ...body, userId }
    this.logger.debug({ '[updateUser]': { requestData } })
    const response = await this.userService.updateUser(requestData)
    this.logger.debug({ '[updateUser]': { response } })

    return response
  }
}
