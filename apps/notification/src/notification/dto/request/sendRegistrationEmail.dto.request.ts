import { IsString } from 'class-validator'
import { ISendRegistrationEmailRequest } from '@app/types/Notification'

export class SendRegistrationEmailDtoRequest implements ISendRegistrationEmailRequest {
  @IsString()
  email: string

  @IsString()
  password: string

  @IsString()
  emailVerificationCode: string
}
