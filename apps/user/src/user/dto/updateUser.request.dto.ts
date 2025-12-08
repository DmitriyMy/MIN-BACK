import { IUpdateUserRequest, UserId } from '@app/types/User'
import { IsUserPassword } from '@app/utils/validation-decorators'
import { IsOptional, IsString, IsUUID } from 'class-validator'

export class UpdateUserRequestDto implements IUpdateUserRequest {
  @IsUUID()
  public readonly userId: UserId

  @IsOptional()
  public readonly phone?: string

  @IsUserPassword()
  @IsOptional()
  public readonly newPassword?: string

  @IsString()
  @IsOptional()
  public readonly name?: string

  @IsString()
  @IsOptional()
  public readonly surname?: string

  @IsString()
  @IsOptional()
  public readonly description?: string | undefined
}
