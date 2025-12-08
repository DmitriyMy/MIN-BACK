import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'

import { ServiceResponse } from '@app/types/Service'
import { IUserService, SingleUserResponse } from '@app/types/User'

import * as DTO from '../dto'
import { UserService } from '../services/user.service'

@Controller()
export class UserController implements Pick<IUserService, 'getUser' | 'updateUser'> {
  private logger = new Logger(UserController.name)

  @Inject(UserService)
  private readonly userService: UserService

  @MessagePattern('getUser')
  public async getUser(@Payload() payload: DTO.GetUserRequestDto): ServiceResponse<SingleUserResponse> {
    this.logger.debug({ '[getUser]': { payload } })
    const response = await this.userService.getUser(payload)
    this.logger.debug({ '[getUser]': { response } })
    return response
  }

  @MessagePattern('updateUser')
  public async updateUser(@Payload() payload: DTO.UpdateUserRequestDto): ServiceResponse<SingleUserResponse> {
    this.logger.debug({ '[updateUser]': { payload } })
    const response = await this.userService.updateUser(payload)
    this.logger.debug({ '[updateUser]': { response } })
    return response
  }
}
