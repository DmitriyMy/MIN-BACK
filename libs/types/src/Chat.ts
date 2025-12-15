import { ChatType } from '@app/constants/chat'

import { UserId } from '@app/types/User'
import { IMessageDB } from './Message'

export type ChatId = string
export type SenderId = UserId
/**
 * Entities
 */

export interface IChatDB extends Pick<IMessageDB, 'chatId' | 'senderId' | 'message' | 'messageStatus'> {
  creator: UserId
  type: ChatType
  createdAt: Date
}

export abstract class IChatService {
  /**
   * Chat
   */
  //   signUpUser(_request: ISignUpUserRequest): ServiceResponse<SignUpUserResponse> {
  //     throw new NotImplementedException()
  //   }
  //   signInUser(_request: ISignInUserRequest): ServiceResponse<SingleUserResponse> {
  //     throw new NotImplementedException()
  //   }
  //   restorePassword(_request: RestorePasswordRequest): ServiceResponse<EmptyResponse> {
  //     throw new NotImplementedException()
  //   }
}
