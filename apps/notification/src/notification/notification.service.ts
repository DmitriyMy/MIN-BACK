import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'

import { ServiceResponse } from '@app/types/Service'

import * as DTO from './dto'
import { NotificationSubject } from '@app/constants/notification'
import { SuccessNotificationResponse } from '@app/types/Notification'

@Injectable()
export class NotificationService {
  constructor(private readonly mailerService: MailerService) {}

  private logger = new Logger(NotificationService.name)

  public async sendRegistrationEmail(
    params: DTO.SendRegistrationEmailDtoRequest,
  ): ServiceResponse<SuccessNotificationResponse> {
    this.logger.debug({ '[sendRegistrationEmail]': { params } })
    const { email, password, emailVerificationCode } = params
    const result = await this.mailerService.sendMail({
      to: email,
      subject: NotificationSubject.REGISTRATION,
      template: './registartion',
      context: {
        email,
        password,
        emailVerificationCode,
      },
    })
    this.logger.debug({ '[sendRegistrationEmail]': { result } })

    return { data: { success: true }, status: HttpStatus.OK }
  }

  public async sendRestorePasswordEmail(
    params: DTO.SendRestorePasswordEmailDtoRequest,
  ): ServiceResponse<SuccessNotificationResponse> {
    this.logger.debug({ '[sendRestorePasswordEmail]': { params } })
    const { email, password, emailVerificationCode } = params
    const result = await this.mailerService.sendMail({
      to: email,
      subject: NotificationSubject.PASSWORD_RESTORE,
      template: './restore',
      context: {
        email,
        password,
        emailVerificationCode,
      },
    })
    this.logger.debug({ '[sendRestorePasswordEmail]': { result } })

    return { data: { success: true }, status: HttpStatus.OK }
  }

  public async sendConfirmModeration(
    params: DTO.SendConfirmModerationDtoRequest,
  ): ServiceResponse<SuccessNotificationResponse> {
    this.logger.debug({ '[sendConfirmModeration]': { params } })
    const { email, card } = params
    const result = await this.mailerService.sendMail({
      to: email,
      subject: NotificationSubject.CONFIRM_MODERATION,
      template: './confirmModeration',
      context: {
        card,
      },
    })
    this.logger.debug({ '[sendConfirmModeration]': { result } })

    return { data: { success: true }, status: HttpStatus.OK }
  }

  public async sendUnConfirmModeration(
    params: DTO.SendUnConfirmModerationDtoRequest,
  ): ServiceResponse<SuccessNotificationResponse> {
    this.logger.debug({ '[sendUnConfirmModeration]': { params } })
    const { email, card, reason } = params
    const result = await this.mailerService.sendMail({
      to: email,
      subject: NotificationSubject.UN_CONFIRM_MODERATION,
      template: './unConfirmModeration',
      context: {
        card,
        reason,
      },
    })
    this.logger.debug({ '[sendUnConfirmModeration]': { result } })

    return { data: { success: true }, status: HttpStatus.OK }
  }
}
