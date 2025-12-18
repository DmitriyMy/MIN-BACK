import { IsEnum, IsString } from 'class-validator'
import { MessageStatus } from '@app/constants/message'
import { IMessageUpdateStatusRequest, MessageId, SenderId } from '@app/types/Message'

export class MessageUpdateStatusRequestDto implements IMessageUpdateStatusRequest {
  @IsString()
  messageId: MessageId

  @IsString()
  senderId: SenderId

  @IsEnum(MessageStatus)
  messageStatus: MessageStatus
}
