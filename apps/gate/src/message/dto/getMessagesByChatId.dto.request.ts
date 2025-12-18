import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { SenderId } from '@app/types/Chat'
import { ChatId, IGetMessagesByChatRequest } from '@app/types/Message'

export class GetMessagesByChatIdDtoRequest implements IGetMessagesByChatRequest {
  @ApiProperty({
    type: String,
    example: 'chat_123',
    required: true,
    nullable: false,
  })
  @IsString()
  chatId: ChatId

  @ApiProperty({
    type: String,
    example: '123',
    required: true,
    nullable: false,
  })
  @IsOptional()
  @IsString()
  senderId: SenderId

  @ApiProperty({
    type: Number,
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number

  @ApiProperty({
    type: Number,
    example: 20,
    required: false,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number
}
