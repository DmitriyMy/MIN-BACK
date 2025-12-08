import { IsEmail } from 'class-validator'
import { ISignInUserRequest } from '@app/types/Auth'
import { EmailOrPhoneDto } from '@app/utils/dto'
import { IsUserPassword } from '@app/utils/validation-decorators'

export class SignInUserRequestDto extends EmailOrPhoneDto implements ISignInUserRequest {
  @IsEmail()
  public email: string

  @IsUserPassword()
  public readonly password: string
}
