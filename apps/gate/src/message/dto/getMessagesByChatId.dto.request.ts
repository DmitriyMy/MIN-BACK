import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'
import { ChatId, IGetMessagesByChatIdRequest } from '@app/types/Message'

export class GetMessagesByChatIdDtoRequest implements IGetMessagesByChatIdRequest {
  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
    nullable: false,
    description: 'ID чата',
  })
  @IsString()
  chatId: ChatId
}

