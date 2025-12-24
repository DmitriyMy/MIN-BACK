import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNumber, IsPositive, IsString, Max } from 'class-validator'
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

  @ApiProperty({
    type: Number,
    example: 1,
    required: true,
    nullable: false,
    description: 'Номер страницы',
  })
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsPositive()
  page: number

  @ApiProperty({
    type: Number,
    example: 10,
    required: true,
    nullable: false,
    description: 'Количество сообщений на странице',
  })
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Max(1000)
  limit: number
}
