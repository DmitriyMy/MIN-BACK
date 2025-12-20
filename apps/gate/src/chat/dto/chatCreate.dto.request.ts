import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'
import { ChatType } from '@app/constants/chat'
import { IChatCreateRequest, SenderId } from '@app/types/Chat'

export class ChatCreateDtoRequest implements Omit<IChatCreateRequest, 'creator'> {
  @ApiProperty({
    enum: ChatType,
    example: ChatType.PRIVATE,
    required: true,
    nullable: false,
    description: 'Тип чата',
  })
  @IsEnum(ChatType)
  type: ChatType

  @ApiProperty({
    type: String,
    example: 'Привет!',
    required: false,
    nullable: true,
    description: 'Первое сообщение в чате (опционально)',
  })
  @IsOptional()
  @IsString()
  message?: string
}
