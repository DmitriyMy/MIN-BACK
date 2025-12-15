import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Logger,
  Param,
  Patch,
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
import { IGetMessageRequest, IMessageService, MessageId } from '@app/types/Message'
import * as DTO from '../dto'
import { ReqMessage } from '../utils/request-message.decorator'

@ApiTags('MessageController')
@ApiBearerAuth()
@Controller({ version: VERSION_NEUTRAL, path: 'message' })
export class MessageController {
  private logger = new Logger(MessageController.name)

  @Inject(IMessageService)
  private readonly messageService: IMessageService

  @Get()
  @ApiOperation({ summary: 'Get message data' })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async getMessage(@ReqMessage('messageId') requestorId: MessageId, @Param('messageId') messageId: MessageId) {
    const requestData: IGetMessageRequest = { messageId }
    if (messageId !== requestorId) {
      throw new ForbiddenException(commonError.DONT_ACCESS)
    }
    this.logger.debug({ '[getMessage]': { requestData } })
    const response = await this.messageService.getMessage(requestData)
    this.logger.debug({ '[getMessage]': { response } })
    return response
  }

  @Patch()
  @ApiOperation({ summary: 'Update message data' })
  @ApiBody({ type: DTO.MessageCreateDtoRequest })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async updateMessage(
    @ReqMessage('messageId') requestorId: MessageId,
    @Param('messageId') messageId: MessageId,
    @Body() body: DTO.MessageCreateDtoRequest,
  ) {
    if (messageId !== requestorId) {
      throw new ForbiddenException(commonError.DONT_ACCESS)
    }
    const requestData: IGetMessageRequest = { ...body, messageId }
    this.logger.debug({ '[updateMessage]': { requestData } })
    const response = await this.messageService.updateMessage(requestData)
    this.logger.debug({ '[updateMessage]': { response } })

    return response
  }
}
