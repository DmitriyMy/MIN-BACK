import { HttpStatus } from '@nestjs/common'

export const commonError = {
  BAD_REQUEST: {
    status: 400,
    error: ['Bad request'],
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    error: ['Internal Server Error'],
  },
  DONT_ACCESS: {
    status: HttpStatus.FORBIDDEN,
    error: ["You don't have access"],
  },
  CHAT_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    error: ['Chat not found'],
  },
  USER_ALREADY_IN_CHAT: {
    status: HttpStatus.CONFLICT,
    error: ['User is already a participant in this chat'],
  },
  PRIVATE_CHAT_FULL: {
    status: HttpStatus.BAD_REQUEST,
    error: ['Private chat cannot have more than 2 participants'],
  },
  UNEXPECTED_ERROR: {
    status: 500,
    error: ['Unexpected error happened'],
  },
}
