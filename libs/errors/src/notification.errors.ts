import { HttpStatus } from '@nestjs/common'

export const notificationError = {
  UNSUPPORTED_NOTIFICATION_FORMAT: {
    status: HttpStatus.BAD_REQUEST,
    error: ['Unsupported notification format'],
  },
}
