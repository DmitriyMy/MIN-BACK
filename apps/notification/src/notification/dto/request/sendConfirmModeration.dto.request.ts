import { IsEnum, IsString } from 'class-validator'
import { ISendConfirmModerationRequest } from '@app/types/Notification'
import { CardType } from '@app/constants/notification'

export class SendConfirmModerationDtoRequest implements ISendConfirmModerationRequest {
  @IsString()
  email: string

  @IsEnum(CardType)
  card: CardType
}
