import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator'
import { ChatType } from '@app/constants/chat'

export class CreateChatRequestDto {
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