import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'
import { CallId } from '@app/types/Call'

export class HangupDtoRequest {
  @ApiProperty({
    type: String,
    example: 'call-uuid',
    required: true,
    nullable: false,
    description: 'ID звонка для завершения',
  })
  @IsString()
  callId: CallId
}

