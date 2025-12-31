import { ThrottlerModuleOptions } from '@nestjs/throttler'
import { EnvironmentType } from '@app/constants/common'

/**
 * Конфигурация rate limiting в зависимости от окружения
 * 
 * Production: Строгие лимиты для защиты от брутфорс атак
 * Development: Более мягкие лимиты для удобства разработки
 */
export function getThrottlerConfig(): ThrottlerModuleOptions {
  const nodeEnv = process.env.NODE_ENV as EnvironmentType
  const isProduction = nodeEnv === EnvironmentType.prod

  // Базовые настройки для всех запросов
  const baseConfig: ThrottlerModuleOptions = {
    throttlers: [
      {
        // TTL (Time To Live) - время в миллисекундах, в течение которого считаются запросы
        ttl: isProduction ? 60000 : 60000, // 60 секунд (60000 мс) для всех окружений
        // Limit - максимальное количество запросов за TTL
        limit: isProduction ? 100 : 1000, // 100 запросов в production, 1000 в development
      },
    ],
    // Storage для хранения счетчиков (по умолчанию in-memory)
    // В production рекомендуется использовать Redis
    storage: undefined, // Можно настроить Redis storage для кластера
  }

  return baseConfig
}

/**
 * Строгие лимиты для эндпоинтов аутентификации
 * Защита от брутфорс атак на пароли
 */
export const AUTH_THROTTLE_CONFIG = {
  // 5 попыток входа в течение 15 минут
  ttl: 15 * 60 * 1000, // 15 минут в миллисекундах
  limit: 5,
}

/**
 * Лимиты для восстановления пароля
 */
export const PASSWORD_RESTORE_THROTTLE_CONFIG = {
  // 3 попытки восстановления пароля в течение часа
  ttl: 60 * 60 * 1000, // 1 час в миллисекундах
  limit: 3,
}

/**
 * Лимиты для регистрации
 */
export const SIGNUP_THROTTLE_CONFIG = {
  // 3 регистрации в течение часа
  ttl: 60 * 60 * 1000, // 1 час в миллисекундах
  limit: 3,
}

