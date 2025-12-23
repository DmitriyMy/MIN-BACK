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
    const response = await this.userService.getUser(payload)
    return response
  }

  @MessagePattern('updateUser')
  public async updateUser(@Payload() payload: DTO.UpdateUserRequestDto): ServiceResponse<SingleUserResponse> {
    const response = await this.userService.updateUser(payload)
    return response
  }
}
