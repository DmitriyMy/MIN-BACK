import { Body, Controller, Get, Inject, Logger, Post, Query, UseGuards, VERSION_NEUTRAL } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'

import { commonError } from '@app/errors'
import { IGetChatsByUserIdRequest, IChatCreateRequest, IChatService } from '@app/types/Chat'
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

  @Get()
  @ApiOperation({ summary: 'Get chats by user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Количество чатов на странице' })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async getChatsByUserId(
    @ReqUser() user: IUserDB,
    @Query() query: DTO.GetChatsByUserIdDtoRequest,
  ) {
    this.logger.debug({ '[getChatsByUserId]': { user, query } })

    const requestData: IGetChatsByUserIdRequest = {
      userId: user.userId,
      page: query.page || 1,
      limit: query.limit || 10,
    }

    const response = await this.chatService.getChatsByUserId(requestData)
    this.logger.debug({ '[getChatsByUserId]': { response } })

    return response
  }
}
