import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator'
import { ICreateChatRequest } from '@app/types/Chat'
import { ChatType } from '@app/constants/chat'

export class CreateChatRequestDto implements ICreateChatRequest {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(ChatType)
  type?: ChatType

  @IsArray()
  @IsString({ each: true })
  participants: string[]
}