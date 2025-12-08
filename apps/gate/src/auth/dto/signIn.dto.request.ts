import { ApiProperty } from '@nestjs/swagger'
import { IsEmail } from 'class-validator'
import { ISignInUserRequest } from '@app/types/Auth'
import { IsUserPassword } from '@app/utils/validation-decorators'

export class SignInDtoRequest implements ISignInUserRequest {
  @ApiProperty({
    type: String,
    example: 'email@email.main',
    required: true,
    nullable: false,
  })
  @IsEmail()
  email: string

  @ApiProperty({
    type: String,
    example: '12345678',
    required: true,
    nullable: false,
  })
  @IsUserPassword()
  password: string
}
