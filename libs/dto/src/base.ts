import { IsPositive, IsString } from 'class-validator'

export class IBaseIterateObject {
  @IsPositive()
  id: number

  @IsString()
  title: string
}
