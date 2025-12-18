import { IsString, IsOptional, IsArray, IsEnum, IsInt } from 'class-validator'
import { ChatType } from '@app/constants/chat'
import { ICreateChatRequest } from '@app/types/Chat'

export class CreateChatRequestDto implements ICreateChatRequest {
  @IsString()
  public name: string

  @IsOptional()
  @IsString()
  public description?: string

  @IsOptional()
  @IsInt()
  @IsEnum(ChatType)
  public type?: ChatType

  @IsArray()
  @IsString({ each: true })
  public participants: string[]
}