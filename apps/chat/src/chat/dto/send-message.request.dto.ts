import { IsString } from 'class-validator'
import { ISendMessageRequest } from '@app/types/Chat'

export class SendMessageRequestDto implements ISendMessageRequest {
  @IsString()
  chatId: string

  @IsString()
  senderId: string

  @IsString()
  content: string
}