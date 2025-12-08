import { NotImplementedException } from '@nestjs/common'
import { EmptyResponse, ErrorResponse, ISuccessResponse, Response, ServiceResponse } from './Service'
import { IUserDB, SingleUserResponse } from './User'

export interface TokenPayload {
  user: Pick<IUserDB, 'userId' | 'email' | 'phone' | 'name'>
}

export type TokenPayloadUser = TokenPayload['user']

export interface SignInSuccessResponse {
  user: IUserDB
  token: string
}

export interface VerifyEmailSuccessResponse {
  user: IUserDB
  token: string
}

export interface SignUpSuccessResponse extends ISuccessResponse {
  email: string
}

export type SignInResponse = Promise<SignInSuccessResponse | ErrorResponse>

export type SignUpUserResponse = Response<{ email: string }>

export interface ISignUpUserRequest extends Partial<IUserDB> {
  email: string
  name: string
  surname?: string
  consent: string
  phone?: string
}

export interface ISignInUserRequest {
  email: string
  password: string
}

export interface RestorePasswordRequest {
  email: string
}

export abstract class IAuthService {
  /**
   * Auth
   */

  signUpUser(_request: ISignUpUserRequest): ServiceResponse<SignUpUserResponse> {
    throw new NotImplementedException()
  }

  signInUser(_request: ISignInUserRequest): ServiceResponse<SingleUserResponse> {
    throw new NotImplementedException()
  }

  restorePassword(_request: RestorePasswordRequest): ServiceResponse<EmptyResponse> {
    throw new NotImplementedException()
  }
}
