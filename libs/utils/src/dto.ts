import { PartialType } from '@nestjs/swagger'
import { TransformFnParams, Type } from 'class-transformer'
import { IsEmail, IsEnum, IsInt, IsNumber, IsPhoneNumber, IsPositive, Max, ValidateIf } from 'class-validator'
import { SortDirection } from '@app/constants/db'
import { RegisterUserRequest } from '@app/types/Auth'
import { PaginationRequest, PaginationWithSortDirectionRequest } from '@app/types/Pagination'

export const ArrayOfStringsTransformer = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.split(',') : value

export const ArrayOfNumbersTransformer = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.split(',').map(Number) : value

export const BooleanTransformer = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' && ['false', 'true'].includes(value) ? value === 'true' : value

export class PaginationRequestDto implements PaginationRequest {
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Max(1000)
  public readonly limit: number

  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsPositive()
  public readonly page: number
}

export class PartialPaginationRequestDto extends PartialType(PaginationRequestDto) {}

export class PaginationWithSortDirectionRequestDto
  extends PaginationRequestDto
  implements PaginationWithSortDirectionRequest
{
  @IsEnum(SortDirection)
  public readonly sortDirection: SortDirection
}

export class PartialPaginationWithSortDirectionRequestDto extends PartialType(PaginationWithSortDirectionRequestDto) {}

export class EmailOrPhoneDto {
  @ValidateIf((o: RegisterUserRequest) => !o.phone)
  @IsEmail()
  public readonly email?: string

  @ValidateIf((o: RegisterUserRequest) => !o.email)
  @IsPhoneNumber()
  public readonly phone?: string
}
