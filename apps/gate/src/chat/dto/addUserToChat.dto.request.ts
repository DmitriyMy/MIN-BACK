import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

export class AddUserToChatDtoRequest {
  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
    nullable: false,
    description: 'ID чата, в который добавляется пользователь',
  })
  @IsUUID()
  chatId: string

  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: true,
    nullable: false,
    description: 'ID пользователя, которого нужно добавить в чат',
  })
  @IsUUID()
  userId: string
}
