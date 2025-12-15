import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'
import { ChatId, IMessageCreateRequest } from '@app/types/Message'

export class MessageCreateDtoRequest implements IMessageCreateRequest {
  @ApiProperty({
    type: String,
    example: '123',
    required: true,
    nullable: false,
  })
  @IsString()
  chatId: ChatId

  @ApiProperty({
    type: String,
    example: 'hello world!',
    required: true,
    nullable: false,
  })
  @IsString()
  message: string
}
