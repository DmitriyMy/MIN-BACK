import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from '@node-rs/bcrypt'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import { User } from '@app/entitiesPG'
import { ServiceResponse } from '@app/types/Service'
import { IUserDB, SingleUserResponse } from '@app/types/User'

import * as DTO from '../dto'
import { dataSourceName } from '../../config/postgresql.config'
import { userError } from '@app/errors'

@Injectable()
export class UserService {
  private logger = new Logger(UserService.name)

  @InjectRepository(User, dataSourceName)
  private readonly userRepository: Repository<User>

  public async getUser({ userId }: DTO.GetUserRequestDto): ServiceResponse<SingleUserResponse> {
    const user = await this.userRepository.findOneBy({ userId })

    if (!user) {
      return userError.USER_NOT_FOUND
    }

    return { data: { user: UserService.serialize(user) }, status: HttpStatus.OK }
  }

  public async updateUser(params: DTO.UpdateUserRequestDto): ServiceResponse<SingleUserResponse> {
    this.logger.debug({ '[updateUser]': { params } })

    const { userId, newPassword } = params

    const user = await this.userRepository.findOneBy({ userId })

    this.logger.debug({ '[updateUser]': { user } })

    if (!user) {
      return userError.USER_NOT_FOUND
    }

    const primitiveFieldsToUpdate = ['phone', 'name', 'surname', 'description'] satisfies Array<keyof User>

    primitiveFieldsToUpdate.forEach((field) => {
      user[field] = params[field] ?? user[field]
    })

    if (newPassword) {
      user.password = await bcrypt.hash(newPassword)
    }

    this.logger.debug({ '[updateUser]': { updatedUser: user } })

    const data = await this.userRepository.update({ userId }, user)
    this.logger.debug({ '[updateExpert]': { data } })

    const success = data.affected! > 0 ? true : false
    if (!success) {
      return userError.USER_UPDATE_ERROR
    }
    await user.reload()

    return { data: { user: UserService.serialize(user) }, status: HttpStatus.OK }
  }

  private static serialize(user: User): IUserDB
  private static serialize(users: User[]): IUserDB[]
  private static serialize(userOrUsers: User | User[]): IUserDB | IUserDB[] {
    return plainToInstance(User, instanceToPlain(userOrUsers))
  }
}
