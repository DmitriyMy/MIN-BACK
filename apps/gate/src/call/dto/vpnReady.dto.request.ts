import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'
import { CallId } from '@app/types/Call'

export class VpnReadyDtoRequest {
  @ApiProperty({
    type: String,
    example: 'call-uuid',
    required: true,
    nullable: false,
    description: 'ID звонка',
  })
  @IsString()
  callId: CallId

  @ApiProperty({
    type: String,
    example: '192.168.1.100',
    required: false,
    nullable: true,
    description: 'Локальный IP адрес для P2P соединения (опционально)',
  })
  @IsString()
  localEndpoint?: string
}

