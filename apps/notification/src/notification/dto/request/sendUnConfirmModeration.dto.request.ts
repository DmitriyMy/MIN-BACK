import { IsEnum, IsString } from 'class-validator'
import { CardType } from '@app/constants/notification'
import { ISendUnConfirmModerationRequest } from '@app/types/Notification'

export class SendUnConfirmModerationDtoRequest implements ISendUnConfirmModerationRequest {
  @IsString()
  email: string

  @IsEnum(CardType)
  card: CardType

  @IsString()
  reason: string
}
