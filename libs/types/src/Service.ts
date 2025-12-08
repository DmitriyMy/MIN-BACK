import { HttpStatus } from '@nestjs/common'

export interface EmptyResponse {
  status: HttpStatus
}

export interface ErrorResponse {
  status: HttpStatus
  error: string[]
  timestamp?: string
}

export interface Response<T> extends EmptyResponse {
  data: T
}

export type CountResponse = Response<{ count: number }>

export type MultipleResponse<T> = Response<{ items: T[]; count: number }>

export type ServiceResponse<T extends EmptyResponse> = Promise<T | ErrorResponse>

export type IArrayObjects<T> = Array<Record<string, T>>

export interface ISuccessResponse {
  success: boolean
}
