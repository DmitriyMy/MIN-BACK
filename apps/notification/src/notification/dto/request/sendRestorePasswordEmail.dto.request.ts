import { IsString } from 'class-validator'
import { ISendRestorePasswordEmailRequest } from '@app/types/Notification'

export class SendRestorePasswordEmailDtoRequest implements ISendRestorePasswordEmailRequest {
  @IsString()
  email: string

  @IsString()
  password: string

  @IsString()
  emailVerificationCode: string
}
