import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'
import { UserId } from '@app/types/User'

export class InitiateCallDtoRequest {
  @ApiProperty({
    type: String,
    example: 'user-uuid',
    required: true,
    nullable: false,
    description: 'ID пользователя, которому звоним',
  })
  @IsString()
  calleeId: UserId
}

