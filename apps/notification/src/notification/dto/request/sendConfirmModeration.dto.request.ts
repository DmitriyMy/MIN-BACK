import { IsEnum, IsString } from 'class-validator'
import { CardType } from '@app/constants/notification'
import { ISendConfirmModerationRequest } from '@app/types/Notification'

export class SendConfirmModerationDtoRequest implements ISendConfirmModerationRequest {
  @IsString()
  email: string

  @IsEnum(CardType)
  card: CardType
}
