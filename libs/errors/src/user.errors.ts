import { HttpStatus } from '@nestjs/common'

export const userError = {
  EMAIL_ALREADY_VERIFIED: {
    error: ['Email already verified'],
  },
  EMAIL_VERIFICATION_PROCESS_NOT_INITIALIZED: {
    error: ['Email verification process not initiated'],
  },
  PHONE_ALREADY_VERIFIED: {
    error: ['Phone already verified'],
  },
  PHONE_VERIFICATION_PROCESS_NOT_INITIALIZED: {
    error: ['Phone verification process not initiated'],
  },
  CODE_WRONG: {
    error: ['Code wrong'],
  },
  USER_ALREADY_EXIST: {
    status: HttpStatus.CONFLICT,
    error: ['User already exists'],
  },
  USER_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    error: ['User was not found'],
  },
  PASSWORD_WRONG: {
    status: HttpStatus.BAD_REQUEST,
    error: ['Password wrong'],
  },
  USER_UPDATE_ERROR: {
    status: HttpStatus.CONFLICT,
    error: ['User update error'],
  },
}
