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
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common'

import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import { commonError } from '@app/errors'
import { IGetMessageRequest, IMessageService, IMessageUpdateRequest, MessageId } from '@app/types/Message'
import { IUserDB } from '@app/types/User'
import { JwtAuthGuard, ReqUser } from '../../auth/utils'
import * as DTO from '../dto'

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
    this.logger.debug({ '[createMessage]': { user, body } })

    const requestData = {
      ...body,
      senderId: user.userId,
    }

    const response = await this.messageService.createMessage(requestData)
    this.logger.debug({ '[createMessage]': { response } })

    return response
  }

  @Get()
  @ApiOperation({ summary: 'Get message data' })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async getMessage(@ReqUser() user: IUserDB, @Param('messageId') messageId: MessageId) {
    const requestData: IGetMessageRequest = { messageId, senderId: user.userId }

    this.logger.debug({ '[getMessage]': { requestData } })
    const response = await this.messageService.getMessage(requestData)
    this.logger.debug({ '[getMessage]': { response } })

    return response
  }

  @Put()
  @ApiOperation({ summary: 'Update message data' })
  @ApiBody({ type: DTO.MessageUpdateDtoRequest })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async updateMessage(
    @ReqUser() user: IUserDB,
    @Param('messageId') messageId: MessageId,
    @Body() body: IMessageUpdateRequest,
  ) {
    const updateData: IMessageUpdateRequest = {
      ...body,
      messageId,
      senderId: user.userId,
    }

    this.logger.debug({ '[updateMessage]': { updateData } })
    const response = await this.messageService.updateMessage(updateData)
    this.logger.debug({ '[updateMessage]': { response } })

    return response
  }

  @Patch()
  @ApiOperation({ summary: 'Update message status' })
  @ApiBody({ type: DTO.MessageUpdateStatusDtoRequest })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async updateMessageStatus(
    @ReqUser() user: IUserDB,
    @Param('messageId') messageId: MessageId,
    @Body() body: Omit<DTO.MessageUpdateStatusDtoRequest, 'messageId' | 'senderId'>,
  ) {
    const updateData = {
      ...body,
      messageId,
      senderId: user.userId,
    }

    this.logger.debug({ '[updateMessageStatus]': { updateData } })
    const response = await this.messageService.updateMessageStatus(updateData)
    this.logger.debug({ '[updateMessageStatus]': { response } })

    return response
  }
}
