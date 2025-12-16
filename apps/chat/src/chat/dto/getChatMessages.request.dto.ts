import { IsString } from 'class-validator'

export class GetChatMessagesRequestDto {
    @IsString()
    chatId: string
}