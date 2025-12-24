import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'

import { commonError } from '@app/errors'
import { IAddUserToChatRequest, IGetChatsByUserIdRequest, IChatCreateRequest, IChatService } from '@app/types/Chat'
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
  public async getChatsByUserId(@ReqUser() user: IUserDB, @Query() query: DTO.GetChatsByUserIdDtoRequest) {
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

  @Put(':chatId/user/:userId')
  @ApiOperation({ summary: 'Add user to chat' })
  @ApiParam({ name: 'chatId', description: 'ID чата', type: String })
  @ApiParam({ name: 'userId', description: 'ID пользователя для добавления', type: String })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  @ApiNotFoundResponse({ schema: { example: commonError.CHAT_NOT_FOUND } })
  public async addUserToChat(
    @ReqUser() user: IUserDB,
    @Param('chatId') chatId: string,
    @Param('userId') userId: string,
  ) {
    this.logger.debug({ '[addUserToChat]': { user, chatId, userId } })

    const requestData: IAddUserToChatRequest = {
      chatId,
      userId,
    }

    // Для RPC передаем requesterId в payload (внутренняя деталь реализации)
    // requesterId не является частью публичного API, он добавляется только для RPC
    const rpcPayload = { ...requestData, requesterId: user.userId }
    const response = await this.chatService.addUserToChat(rpcPayload as any)
    this.logger.debug({ '[addUserToChat]': { response } })

    return response
  }
}
