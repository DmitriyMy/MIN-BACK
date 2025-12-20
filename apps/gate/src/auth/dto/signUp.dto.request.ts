import { ApiProperty } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString } from 'class-validator'
import { ISignUpUserRequest } from '@app/types/Auth'

export class SignUpDtoRequest implements ISignUpUserRequest {
  @ApiProperty({
    type: String,
    example: 'name',
    required: true,
    nullable: false,
  })
  @IsString()
  name: string

  @ApiProperty({
    type: String,
    example: 'email@email.main',
    required: true,
    nullable: false,
  })
  @IsString()
  email: string

  @ApiProperty({
    type: String,
    example: '2024-03-03T15:15:10.417Z',
    required: true,
    nullable: false,
  })
  @IsDateString()
  consent: string

  @ApiProperty({
    type: String,
    example: 'surname',
    required: false,
    nullable: false,
  })
  @IsString()
  surname = ''

  @ApiProperty({
    type: String,
    example: '777777777777',
    required: false,
    nullable: false,
  })
  @IsString()
  @IsOptional()
  phone = ''
}
