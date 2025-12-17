import { IsEnum, IsOptional, IsString } from 'class-validator'
import { MessageStatus } from '@app/constants/message'
import { IMessageUpdateRequest, MessageId, SenderId } from '@app/types/Message'

export class MessageUpdateRequestDto implements IMessageUpdateRequest {
  @IsString()
  messageId: MessageId

  @IsString()
  senderId: SenderId

  @IsString()
  message: string

  @IsOptional()
  @IsEnum(MessageStatus)
  messageStatus?: MessageStatus
}
