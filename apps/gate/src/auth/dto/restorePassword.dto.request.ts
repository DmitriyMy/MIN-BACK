import { ApiProperty } from '@nestjs/swagger'
import { IsEmail } from 'class-validator'
import { RestorePasswordRequest } from '@app/types/Auth'

export class RestorePasswordDtoRequest implements RestorePasswordRequest {
  @ApiProperty({
    type: String,
    example: 'email@email.main',
    required: true,
    nullable: false,
  })
  @IsEmail()
  email: string
}
