import { NotImplementedException } from '@nestjs/common'
import { UserRole } from '@app/constants/user'
import { PartialPaginationWithSortDirectionRequest } from './Pagination'
import { EmptyResponse, MultipleResponse, Response, ServiceResponse } from './Service'

export type UserId = string
/**
 * Entities
 */

export interface IUserDB {
  userId: UserId
  name: string
  surname: string
  email: string
  newEmail: string
  phone: string
  isVerifiedEmail: boolean
  password: string
  newPassword: string
  consent: string
  role: UserRole
  description: string
}

/**
 * Request: User
 */
export interface IGetUserRequest {
  userId: UserId
}

export interface IUpdateUserRequest {
  name?: string
  userId: UserId
  phone?: string
  newPassword?: string
  surname?: string
  description?: string
}

/**
 * Request: Invitation
 */

export interface CreateInvitationRequest {
  requestorId: string
  phone: string
}

export interface ReadInvitationsRequest extends PartialPaginationWithSortDirectionRequest {
  requestorId: string
}

export interface DeleteInvitationRequest {
  requestorId: string
  phone: string
}

/**
 * Response: User
 */

export type SingleUserResponse = Response<{ user: IUserDB }>
export type MultipleUsersResponse = MultipleResponse<IUserDB>

/**
 * Response: Invitation
 */

export type CreateInvitationResponse = EmptyResponse | SingleUserResponse

/**
 * Services
 */

export abstract class IUserService {
  /**
   * User
   */
  getUser(_request: IGetUserRequest): ServiceResponse<SingleUserResponse> {
    throw new NotImplementedException()
  }

  updateUser(_request: IUpdateUserRequest): ServiceResponse<SingleUserResponse> {
    throw new NotImplementedException()
  }
}
