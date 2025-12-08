export const NOTIFICATION_QUEUE = 'notification'

export enum NotificationType {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

const name = 'сервисе MIN'

export enum NotificationSubject {
  REGISTRATION = `Регистрация на ${name}`,
  VERIFICATION = `Подтверждение учетной записи на ${name}`,
  PASSWORD_RESTORE = `Востановление пароля для учетной записи на ${name}`,
  CONFIRM_MODERATION = `Успешное прохождение модерации`,
  UN_CONFIRM_MODERATION = `Отклонено модератором`,
}

export enum CardType {
  PERSON = 'персона',
  ACTION = 'события',
}
