import * as crypto from 'crypto'
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from '@node-rs/bcrypt'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import { NotificationSubject } from '@app/constants/notification'
import { UserRole } from '@app/constants/user'
import { User } from '@app/entitiesPG'
import { commonError, notificationError, userError } from '@app/errors'
import { IAuthService, ISignInUserRequest, SignUpUserResponse } from '@app/types/Auth'
import { INotificationService } from '@app/types/Notification'
import { EmptyResponse, ServiceResponse } from '@app/types/Service'
import { IUserDB, SingleUserResponse } from '@app/types/User'

import { isErrorServiceResponse } from '@app/utils/service'
import { dataSourceName } from '../../config/postgresql.config'
import { VerificationService } from '../../verification/verification.service'
import * as DTO from '../dto'

@Injectable()
export class AuthService implements IAuthService {
  private logger = new Logger(AuthService.name)

  @InjectRepository(User, dataSourceName)
  private readonly userRepository: Repository<User>

  @Inject(VerificationService)
  private readonly verificationService: VerificationService

  @Inject(INotificationService)
  private readonly notificationService: INotificationService

  public async signUpUser(params: DTO.SignUpUserRequestDto): ServiceResponse<SignUpUserResponse> {
    this.logger.debug({ '[signUpUser]': { params } })

    const { email, phone } = params

    const foundUser = await this.userRepository.findOne({ where: [{ email }, { phone }] })

    this.logger.debug({ '[signUpUser]': { foundUser } })

    if (foundUser && foundUser.isVerifiedEmail) {
      return userError.USER_ALREADY_EXIST
    }

    const user = foundUser ?? this.userRepository.create(params)

    const { hashedPassword } = await this.sendLoginInformationToEmail(user, NotificationSubject.REGISTRATION)

    user.password = hashedPassword

    await user.save()
    await user.reload()

    this.logger.debug({ '[signUpUser]': { updatedUser: user } })

    return { data: { email: user.email }, status: HttpStatus.CREATED }
  }

  public async signInUser(params: DTO.SignInUserRequestDto): ServiceResponse<SingleUserResponse> {
    this.logger.debug({ '[signInUser]': { params } })

    const user = await this.readUserByEmail(params)

    this.logger.debug({ '[signInUser]': { user } })

    if (!user) {
      return userError.USER_NOT_FOUND
    }

    const { password } = params

    let isPasswordValid = false
    let isNewPasswordValid = false

    if (user.newPassword) {
      isNewPasswordValid = await bcrypt.compare(password, user.newPassword)
      if (isNewPasswordValid) {
        user.password = password
        user.newPassword = ''
        await user.save()
        await user.reload()
      }
    }
    isPasswordValid = await bcrypt.compare(password, user.password)

    this.logger.debug({ '[signInUser]': { isPasswordValid } })

    if (!isPasswordValid && !isNewPasswordValid) {
      throw new Error(commonError.BAD_REQUEST.error[0])
    }

    if (!user.isVerifiedEmail) {
      user.role = UserRole.person
      user.isVerifiedEmail = true
      await user.save()
      await user.reload()
    }

    return { data: { user: AuthService.serialize(user) }, status: HttpStatus.OK }
  }

  public async restorePassword(params: DTO.RestorePasswordRequestDto): ServiceResponse<EmptyResponse> {
    this.logger.debug({ '[restorePassword]': { params } })

    const user = await this.userRepository.findOneBy(params)

    this.logger.debug({ '[restorePassword]': { user } })

    if (!user) {
      return userError.USER_NOT_FOUND
    }

    const { hashedPassword } = await this.sendLoginInformationToEmail(user, NotificationSubject.PASSWORD_RESTORE)

    user.newPassword = hashedPassword

    await user.save()
    await user.reload()

    return { status: HttpStatus.NO_CONTENT, error: [] }
  }

  private async readUserByEmail({ email }: ISignInUserRequest): Promise<User | null> {
    return this.userRepository.findOneBy({ email })
  }

  private static serialize(user: User): IUserDB
  private static serialize(users: User[]): IUserDB[]
  private static serialize(userOrUsers: User | User[]): IUserDB | IUserDB[] {
    return plainToInstance(User, instanceToPlain(userOrUsers))
  }

  private async sendLoginInformationToEmail(
    user: User,
    notificationSubject: NotificationSubject,
  ): Promise<{ hashedPassword: string }> {
    const password = AuthService.getRandomPassword()

    this.logger.debug({ '[password]': { password } })

    const hashedPassword = await bcrypt.hash(password)

    const emailVerificationCode = this.verificationService.getEmailToken(user.id)

    switch (notificationSubject) {
      case NotificationSubject.REGISTRATION: {
        const result = await this.notificationService.sendRegistrationEmail({
          email: user.email,
          password,
          emailVerificationCode,
        })
        if (isErrorServiceResponse(result)) {
          const { status, error } = result
          throw new HttpException(error.join(', '), status)
        }
        break
      }
      case NotificationSubject.PASSWORD_RESTORE: {
        const result = await this.notificationService.sendRestorePasswordEmail({
          email: user.email,
          password,
          emailVerificationCode,
        })
        if (isErrorServiceResponse(result)) {
          const { status, error } = result
          throw new HttpException(error.join(', '), status)
        }
        break
      }
      default: {
        new Error(notificationError.UNSUPPORTED_NOTIFICATION_FORMAT.error[0])
      }
    }

    return { hashedPassword }
  }

  private static getRandomPassword(): string {
    const length = 12
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const symbols = '!@#$%^&*()_-+=<>?/'
    const allCharacters = characters + symbols

    let password = ''

    for (let i = 0; i < length; i += 1) {
      const randomIndex = crypto.randomInt(0, allCharacters.length)

      password += allCharacters.charAt(randomIndex)
    }

    return password
  }
}
