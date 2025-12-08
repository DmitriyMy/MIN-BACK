import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
import { IUpdateUserRequest } from '@app/types/User'
import { IsUserPassword } from '@app/utils/validation-decorators'

export class UpdateUserDtoRequest implements Omit<IUpdateUserRequest, 'userId'> {
  @ApiProperty({
    type: String,
    example: 'name',
    required: false,
    nullable: false,
  })
  @IsString()
  @IsOptional()
  name?: string

  @ApiProperty({
    type: String,
    example: 'surname',
    required: false,
    nullable: false,
  })
  @IsString()
  @IsOptional()
  surname?: string

  @ApiProperty({
    type: String,
    example: 'description',
    required: false,
    nullable: false,
  })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({
    type: String,
    example: '777777777777',
    required: false,
    nullable: false,
  })
  @IsString()
  @IsOptional()
  phone?: string

  @ApiProperty({
    type: String,
    example: '12345678',
    required: false,
    nullable: false,
  })
  @IsUserPassword()
  @IsOptional()
  newPassword?: string
}
