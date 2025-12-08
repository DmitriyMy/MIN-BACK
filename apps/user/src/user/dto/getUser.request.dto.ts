import { IGetUserRequest, UserId } from '@app/types/User'
import { IsNotEmpty, IsUUID } from 'class-validator'

export class GetUserRequestDto implements IGetUserRequest {
  @IsUUID()
  @IsNotEmpty()
  public readonly userId: UserId
}
