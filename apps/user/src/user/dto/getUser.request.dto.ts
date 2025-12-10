import { IsNotEmpty, IsUUID } from 'class-validator'
import { IGetUserRequest, UserId } from '@app/types/User'

export class GetUserRequestDto implements IGetUserRequest {
  @IsUUID()
  @IsNotEmpty()
  public readonly userId: UserId
}
