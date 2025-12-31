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
    // ИСПРАВЛЕНИЕ: Не логируем params, так как он может содержать пароль
    const { email, phone } = params
    this.logger.debug({ '[signUpUser]': { email, phone } })

    const foundUser = await this.userRepository.findOne({ where: [{ email }, { phone }] })

    // ИСПРАВЛЕНИЕ: Не логируем полный объект user, так как он содержит пароль
    this.logger.debug({
      '[signUpUser]': { foundUser: foundUser ? { userId: foundUser.userId, email: foundUser.email } : null },
    })

    if (foundUser && foundUser.isVerifiedEmail) {
      return userError.USER_ALREADY_EXIST
    }

    const user = foundUser ?? this.userRepository.create(params)

    const { hashedPassword } = await this.sendLoginInformationToEmail(user, NotificationSubject.REGISTRATION)

    user.password = hashedPassword

    await user.save()
    await user.reload()

    // ИСПРАВЛЕНИЕ: Не логируем полный объект user, так как он содержит пароль
    this.logger.debug({ '[signUpUser]': { userId: user.userId, email: user.email } })

    return { data: { email: user.email }, status: HttpStatus.CREATED }
  }

  public async signInUser(params: DTO.SignInUserRequestDto): ServiceResponse<SingleUserResponse> {
    // ИСПРАВЛЕНИЕ: Не логируем params, так как он содержит пароль
    this.logger.debug({ '[signInUser]': { email: params.email } })

    const user = await this.readUserByEmail(params)

    // ИСПРАВЛЕНИЕ: Не логируем полный объект user, так как он содержит пароль
    this.logger.debug({ '[signInUser]': { user: user ? { userId: user.userId, email: user.email } : null } })

    if (!user) {
      return userError.USER_NOT_FOUND
    }

    const { password } = params

    let isPasswordValid = false
    let isNewPasswordValid = false

    if (user.newPassword) {
      isNewPasswordValid = await bcrypt.compare(password, user.newPassword)
      if (isNewPasswordValid) {
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Хешируем пароль перед сохранением
        user.password = await bcrypt.hash(password, 10)
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
    // ИСПРАВЛЕНИЕ: Не логируем params полностью, только безопасные поля
    this.logger.debug({ '[restorePassword]': { email: params.email } })

    const user = await this.userRepository.findOneBy(params)

    // ИСПРАВЛЕНИЕ: Не логируем полный объект user, так как он содержит пароль
    this.logger.debug({ '[restorePassword]': { user: user ? { userId: user.userId, email: user.email } : null } })

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

    // ИСПРАВЛЕНИЕ: Не логируем пароль в открытом виде
    this.logger.debug({ '[sendLoginInformationToEmail]': { userId: user.userId, passwordLength: password.length } })

    const hashedPassword = await bcrypt.hash(password)

    const emailVerificationCode = this.verificationService.getEmailToken(user.userId)

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
        throw new Error(notificationError.UNSUPPORTED_NOTIFICATION_FORMAT.error[0])
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
