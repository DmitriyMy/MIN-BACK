import { EnvironmentType } from '@app/constants/common'

/**
 * Получает настройки CORS origin в зависимости от окружения
 * 
 * В production (prod) - требует CORS_ORIGIN и не использует '*'
 * В development (local, dev, staging) - разрешает более гибкие настройки
 * 
 * @returns string | string[] | boolean - настройки origin для CORS
 */
export function getCorsOrigin(): string | string[] | boolean {
  const nodeEnv = process.env.NODE_ENV as EnvironmentType
  const corsOrigin = process.env.CORS_ORIGIN

  // Production окружение - строгие правила
  if (nodeEnv === EnvironmentType.prod) {
    if (!corsOrigin) {
      throw new Error(
        'CORS_ORIGIN must be set in production environment. ' +
        'Please set CORS_ORIGIN environment variable with comma-separated list of allowed origins.'
      )
    }

    // В production всегда используем список разрешенных origins
    const origins = corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
    
    if (origins.length === 0) {
      throw new Error('CORS_ORIGIN must contain at least one valid origin in production')
    }

    return origins
  }

  // Development окружения (local, dev, staging) - более гибкие правила
  if (corsOrigin) {
    // Если указан CORS_ORIGIN, используем его
    const origins = corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
    return origins.length > 0 ? origins : true
  }

  // Если CORS_ORIGIN не указан в dev, разрешаем все (для удобства разработки)
  return true
}

