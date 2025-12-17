import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'
import { IMessageUpdateRequest } from '@app/types/Message'

export class MessageUpdateDtoRequest implements IMessageUpdateRequest {
  @ApiProperty({
    type: String,
    example: 'Updated message text',
    nullable: false,
  })
  @IsString()
  message: string
}
