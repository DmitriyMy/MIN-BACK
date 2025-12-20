import { Body, Controller, Inject, Logger, Post, UseGuards, VERSION_NEUTRAL } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import { commonError } from '@app/errors'
import { IChatCreateRequest, IChatService } from '@app/types/Chat'
import { IUserDB } from '@app/types/User'
import { JwtAuthGuard, ReqUser } from '../../auth/utils'
import * as DTO from '../dto'

@ApiTags('ChatController')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ version: VERSION_NEUTRAL, path: 'chat' })
export class ChatController {
  private logger = new Logger(ChatController.name)

  @Inject(IChatService)
  private readonly chatService: IChatService

  @Post()
  @ApiOperation({ summary: 'Create chat' })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async createChat(@ReqUser() user: IUserDB, @Body() body: DTO.ChatCreateDtoRequest) {
    this.logger.debug({ '[createChat]': { user, body } })

    const requestData: IChatCreateRequest = {
      creator: user.userId,
      type: body.type,
      message: body.message,
    }

    const response = await this.chatService.createChat(requestData)
    this.logger.debug({ '[createChat]': { response } })

    return response
  }
}
