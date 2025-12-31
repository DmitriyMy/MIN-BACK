import { IsString, IsEnum, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export enum WebRTCSignalType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
}

export class WebRTCSdpDto {
  @IsString()
  type!: string

  @IsString()
  sdp!: string
}

export class WebRTCCandidateDto {
  @IsString()
  candidate!: string

  @IsOptional()
  @IsString()
  sdpMid?: string | null

  @IsOptional()
  sdpMLineIndex?: number | null
}

export class WebRTCSignalDtoRequest {
  @IsString()
  callId!: string

  @IsEnum(WebRTCSignalType)
  type!: WebRTCSignalType

  @IsOptional()
  @ValidateNested()
  @Type(() => WebRTCSdpDto)
  sdp?: WebRTCSdpDto

  @IsOptional()
  @ValidateNested()
  @Type(() => WebRTCCandidateDto)
  candidate?: WebRTCCandidateDto
}


