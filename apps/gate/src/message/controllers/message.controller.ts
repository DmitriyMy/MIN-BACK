import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common'

import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import { commonError } from '@app/errors'
import {
  ChatId,
  IGetMessageRequest,
  IGetMessagesByChatIdRequest,
  IMessageService,
  IMessageUpdateRequest,
  IMessageUpdateStatusRequest,
  MessageId,
} from '@app/types/Message'
import { IUserDB } from '@app/types/User'
import { JwtAuthGuard, ReqUser } from '../../auth/utils'
import * as DTO from '../dto'
import { MessageUpdateDtoRequest } from '../dto/messageUpdate.dto.request'
import { MessageUpdateStatusDtoRequest } from '../dto/messageUpdateStatus.dto.request'

@ApiTags('MessageController')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ version: VERSION_NEUTRAL, path: 'message' })
export class MessageController {
  private logger = new Logger(MessageController.name)

  @Inject(IMessageService)
  private readonly messageService: IMessageService

  @Post()
  @ApiOperation({ summary: 'Create message' })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async createMessage(@ReqUser() user: IUserDB, @Body() body: DTO.MessageCreateDtoRequest) {
    const requestData = {
      ...body,
      senderId: user.userId,
    }

    const response = await this.messageService.createMessage(requestData)

    return response
  }

  @Get(':chatId')
  @ApiOperation({ summary: 'Get messages by chat ID' })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  @ApiNotFoundResponse({ schema: { example: commonError.CHAT_NOT_FOUND } })
  public async getMessagesByChatId(
    @ReqUser() user: IUserDB,
    @Param('chatId') chatId: ChatId,
    @Query() query: DTO.GetMessagesByChatIdDtoRequest,
  ) {
    const requestData: IGetMessagesByChatIdRequest = {
      chatId,
      userId: user.userId,
      page: query.page,
      limit: query.limit,
    }

    const response = await this.messageService.getMessagesByChatId(requestData)

    return response
  }

  @Get('single/:messageId')
  @ApiOperation({ summary: 'Get message data' })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async getMessage(@ReqUser() user: IUserDB, @Param('messageId') messageId: MessageId) {
    const requestData: IGetMessageRequest = { messageId, senderId: user.userId }

    const response = await this.messageService.getMessage(requestData)

    return response
  }

  @Put()
  @ApiOperation({ summary: 'Update message data' })
  @ApiBody({ type: MessageUpdateDtoRequest })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async updateMessage(
    @ReqUser() user: IUserDB,
    @Param('messageId') messageId: MessageId,
    @Body() body: DTO.MessageUpdateDtoRequest,
  ) {
    const updateData: IMessageUpdateRequest = {
      message: body.message,
      messageId,
      senderId: user.userId,
    }

    const response = await this.messageService.updateMessage(updateData)
    return response
  }

  @Patch()
  @ApiOperation({ summary: 'Update message status' })
  @ApiBody({ type: MessageUpdateStatusDtoRequest })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async updateMessageStatus(
    @ReqUser() user: IUserDB,
    @Param('messageId') messageId: MessageId,
    @Body() body: DTO.MessageUpdateStatusDtoRequest,
  ) {
    const updateData: IMessageUpdateStatusRequest = {
      messageStatus: body.messageStatus,
      messageId,
      senderId: user.userId,
    }

    const response = await this.messageService.updateMessageStatus(updateData)

    return response
  }
}
