import { NotImplementedException } from '@nestjs/common'
import { CardType, NotificationType } from '@app/constants/notification'

import { ISuccessResponse, Response, ServiceResponse } from './Service'

export interface ISendRegistrationEmailRequest {
  email: string
  password: string
  emailVerificationCode: string
}

export interface ISendRestorePasswordEmailRequest {
  email: string
  password: string
  emailVerificationCode: string
}

export interface ISendConfirmModerationRequest {
  email: string
  card: CardType
}

export interface ISendUnConfirmModerationRequest {
  email: string
  card: CardType
  reason: string
}

/**
 * Request: Notification
 */

export interface SendRequest {
  type: NotificationType
  message?: string
  /** type = EMAIL */
  subject?: string
  /** type = SMS */
  recipientPhoneNumber?: string
  /** type = EMAIL */
  recipientEmails?: string[]
}

/**
 * Response: Notification
 */

export type SuccessNotificationResponse = Response<ISuccessResponse>

/**
 * Services
 */

export abstract class INotificationService {
  /**
   * Notification
   */

  sendRegistrationEmail(_request: ISendRegistrationEmailRequest): ServiceResponse<SuccessNotificationResponse> {
    throw new NotImplementedException()
  }

  sendRestorePasswordEmail(_request: ISendRestorePasswordEmailRequest): ServiceResponse<SuccessNotificationResponse> {
    throw new NotImplementedException()
  }

  sendConfirmModeration(_request: ISendConfirmModerationRequest): ServiceResponse<SuccessNotificationResponse> {
    throw new NotImplementedException()
  }

  sendUnConfirmModeration(_request: ISendUnConfirmModerationRequest): ServiceResponse<SuccessNotificationResponse> {
    throw new NotImplementedException()
  }
}
