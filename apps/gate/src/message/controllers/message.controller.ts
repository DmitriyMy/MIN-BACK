import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Logger,
  Param,
  Patch,
  Post,
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
import { CreateMessageSuccessResponse, IGetMessageRequest, IMessageService, MessageId } from '@app/types/Message'
import { getData } from '@app/utils/service'
import * as DTO from '../dto'
import { ReqMessage } from '../utils/request-message.decorator'

@ApiTags('MessageController')
@ApiBearerAuth()
@Controller({ version: VERSION_NEUTRAL, path: 'message' })
export class MessageController {
  private logger = new Logger(MessageController.name)

  @Inject(IMessageService)
  private readonly messageService: IMessageService

  @Post()
  @ApiOperation({ summary: 'Create message' })
  @ApiInternalServerErrorResponse({ schema: { example: commonError.INTERNAL_SERVER_ERROR } })
  @ApiForbiddenResponse({ schema: { example: commonError.DONT_ACCESS } })
  public async createMessage(@Body() body: DTO.MessageCreateDtoRequest): Promise<CreateMessageSuccessResponse> {
    this.logger.debug({ '[createMessage]': { body } })
    const response = await this.messageService.createMessage(body)
    this.logger.debug({ '[createMessage]': { response } })

    const { message: messageObj } = getData(response).data
    const messageText = messageObj.message
    return { message: messageText, success: !!messageText }
  }

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
