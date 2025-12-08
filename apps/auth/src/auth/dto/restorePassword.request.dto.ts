import { IsEmail } from 'class-validator'
import { RestorePasswordRequest } from '@app/types/Auth'

export class RestorePasswordRequestDto implements RestorePasswordRequest {
  @IsEmail()
  public email: string
}
