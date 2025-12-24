import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, IsInt, IsPositive, Max, IsOptional } from 'class-validator'
import { PaginationRequestDto } from '@app/utils/dto'

export class GetChatsByUserIdDtoRequest extends PaginationRequestDto {
  @ApiProperty({
    type: Number,
    example: 10,
    required: false,
    default: 10,
    description: 'Количество чатов на странице',
  })
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Max(1000)
  @IsOptional()
  limit: number

  @ApiProperty({
    type: Number,
    example: 1,
    required: false,
    default: 1,
    description: 'Номер страницы',
  })
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsPositive()
  @IsOptional()
  page: number
}

