import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'
import { MessageStatus } from '@app/constants/message'
import { IMessageUpdateStatusRequest } from '@app/types/Message'

export class MessageUpdateStatusDtoRequest implements Pick<IMessageUpdateStatusRequest, 'messageStatus'> {
  @ApiProperty({
    enum: MessageStatus,
    example: MessageStatus.read,
    required: true,
    nullable: false,
  })
  @IsEnum(MessageStatus)
  messageStatus: MessageStatus
}
