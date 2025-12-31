import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'

import { INotificationService, SuccessNotificationResponse } from '@app/types/Notification'
import { ServiceResponse } from '@app/types/Service'

import * as DTO from './dto'
import { NotificationService } from './notification.service'

@Controller()
export class NotificationController implements INotificationService {
  private logger = new Logger(NotificationController.name)

  @Inject(NotificationService)
  private readonly notificationService: NotificationService

  @MessagePattern('sendRegistrationEmail')
  public async sendRegistrationEmail(
    @Payload() payload: DTO.SendRegistrationEmailDtoRequest,
  ): ServiceResponse<SuccessNotificationResponse> {
    // ИСПРАВЛЕНИЕ: Не логируем payload, так как он содержит пароль
    this.logger.debug({ '[sendRegistrationEmail]': { email: payload.email } })
    const response = await this.notificationService.sendRegistrationEmail(payload)
    this.logger.debug({ '[sendRegistrationEmail]': { status: response.status } })
    return response
  }

  @MessagePattern('sendRestorePasswordEmail')
  public async sendRestorePasswordEmail(
    @Payload() payload: DTO.SendRestorePasswordEmailDtoRequest,
  ): ServiceResponse<SuccessNotificationResponse> {
    // ИСПРАВЛЕНИЕ: Не логируем payload, так как он содержит пароль
    this.logger.debug({ '[sendRestorePasswordEmail]': { email: payload.email } })
    const response = await this.notificationService.sendRestorePasswordEmail(payload)
    this.logger.debug({ '[sendRestorePasswordEmail]': { status: response.status } })
    return response
  }

  @MessagePattern('sendConfirmModeration')
  public async sendConfirmModeration(
    @Payload() payload: DTO.SendConfirmModerationDtoRequest,
  ): ServiceResponse<SuccessNotificationResponse> {
    this.logger.debug({ '[sendConfirmModeration]': { payload } })
    const response = await this.notificationService.sendConfirmModeration(payload)
    this.logger.debug({ '[sendConfirmModeration]': { response } })
    return response
  }

  @MessagePattern('sendUnConfirmModeration')
  public async sendUnConfirmModeration(
    @Payload() payload: DTO.SendUnConfirmModerationDtoRequest,
  ): ServiceResponse<SuccessNotificationResponse> {
    this.logger.debug({ '[sendUnConfirmModeration]': { payload } })
    const response = await this.notificationService.sendUnConfirmModeration(payload)
    this.logger.debug({ '[sendUnConfirmModeration]': { response } })
    return response
  }
}
