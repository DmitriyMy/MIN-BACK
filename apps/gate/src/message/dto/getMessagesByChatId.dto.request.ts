import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'
import { uuidV4 } from 'ethers'
import { ChatId, IGetMessagesByChatRequest } from '@app/types/Message'
import { UserId } from '@app/types/User'

export class GetMessagesByChatIdDtoRequest implements IGetMessagesByChatRequest {
  @ApiProperty({
    type: uuidV4,
    example: '57b44a11-9c62-4341-90b4-686ae5f546de',
    required: true,
    nullable: false,
  })
  @IsUUID()
  chatId: ChatId

  @ApiProperty({
    type: String,
    example: '123',
    required: true,
    nullable: false,
  })
  @IsOptional()
  @IsString()
  participant?: UserId

  @ApiProperty({
    type: Number,
    example: 1,
    required: false,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  page = 1

  @ApiProperty({
    type: Number,
    example: 20,
    required: false,
    default: 20,
  })
  @IsNumber()
  @Min(1)
  @Max(50)
  limit = 20
}
