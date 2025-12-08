import { IUser } from '@app/types/User'

declare global {
  namespace Express {
    // Reason: Need to extend express user interface
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends IUser {}
  }
}
