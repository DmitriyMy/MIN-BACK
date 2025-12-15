import { IsString } from 'class-validator'

export class SendMessageRequestDto {
  @IsString()
  chatId: string

  @IsString()
  senderId: string

  @IsString()
  content: string
}