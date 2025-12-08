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
  UNEXPECTED_ERROR: {
    status: 500,
    error: ['Unexpected error happened'],
  },
}
