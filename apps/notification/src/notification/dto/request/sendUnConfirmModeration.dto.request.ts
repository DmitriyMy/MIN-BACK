import { IsEnum, IsString } from 'class-validator'
import { ISendUnConfirmModerationRequest } from '@app/types/Notification'
import { CardType } from '@app/constants/notification'

export class SendUnConfirmModerationDtoRequest implements ISendUnConfirmModerationRequest {
  @IsString()
  email: string

  @IsEnum(CardType)
  card: CardType

  @IsString()
  reason: string
}
