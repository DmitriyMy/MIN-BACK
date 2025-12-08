import { IsEmail, IsOptional, IsString } from 'class-validator'
import { ISignUpUserRequest } from '@app/types/Auth'

export class SignUpUserRequestDto implements ISignUpUserRequest {
  @IsString()
  name: string

  @IsEmail()
  email: string

  @IsString()
  consent: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsString()
  @IsOptional()
  surname?: string
}
