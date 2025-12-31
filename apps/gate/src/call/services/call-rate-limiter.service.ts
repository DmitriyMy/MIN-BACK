import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UserId } from '@app/types/User'

interface CallAttempt {
  count: number
  resetAt: number
}

interface RejectedCallCooldown {
  callerId: UserId
  calleeId: UserId
  cooldownUntil: number
}

interface ActiveCallCount {
  count: number
}

@Injectable()
export class CallRateLimiterService {
  private logger = new Logger(CallRateLimiterService.name)

  // Общее количество звонков пользователя в минуту
  private callAttempts = new Map<UserId, CallAttempt>()

  // Количество звонков одному пользователю в минуту
  private callsToUser = new Map<string, CallAttempt>() // key: "callerId:calleeId"

  // Cooldown после отклонения звонка
  private rejectedCallCooldowns = new Map<string, RejectedCallCooldown>() // key: "callerId:calleeId"

  // Количество активных звонков пользователя
  private activeCallsCount = new Map<UserId, ActiveCallCount>()

  // Настройки из переменных окружения
  private readonly callsPerMinute: number
  private readonly callsToUserPerMinute: number
  private readonly maxActiveCalls: number
  private readonly rejectedCallCooldownMs: number

  constructor(private readonly configService: ConfigService) {
    // Загружаем настройки из переменных окружения
    this.callsPerMinute = parseInt(
      this.configService.get<string>('CALL_RATE_LIMIT_PER_MINUTE') || '3',
      10,
    )
    this.callsToUserPerMinute = parseInt(
      this.configService.get<string>('CALL_RATE_LIMIT_TO_USER_PER_MINUTE') || '3',
      10,
    )
    this.maxActiveCalls = parseInt(
      this.configService.get<string>('CALL_MAX_ACTIVE_CALLS') || '1',
      10,
    )
    this.rejectedCallCooldownMs = parseInt(
      this.configService.get<string>('CALL_REJECTED_COOLDOWN_SECONDS') || '30',
      10,
    ) * 1000

    this.logger.debug({
      '[constructor]': {
        callsPerMinute: this.callsPerMinute,
        callsToUserPerMinute: this.callsToUserPerMinute,
        maxActiveCalls: this.maxActiveCalls,
        rejectedCallCooldownMs: this.rejectedCallCooldownMs,
      },
    })

    // Периодическая очистка истекших записей (каждую минуту)
    setInterval(() => this.cleanupExpiredEntries(), 60 * 1000)
  }

  /**
   * Проверяет, может ли пользователь инициировать звонок
   */
  canInitiateCall(callerId: UserId, calleeId: UserId): { allowed: boolean; reason?: string } {
    const now = Date.now()
    const userKey = `${callerId}:${calleeId}`

    // Проверка 1: Cooldown после отклонения звонка
    const cooldown = this.rejectedCallCooldowns.get(userKey)
    if (cooldown && cooldown.cooldownUntil > now) {
      const remainingSeconds = Math.ceil((cooldown.cooldownUntil - now) / 1000)
      this.logger.warn({
        '[canInitiateCall]': {
          reason: 'Cooldown after rejected call',
          callerId,
          calleeId,
          remainingSeconds,
        },
      })
      return {
        allowed: false,
        reason: `Please wait ${remainingSeconds} seconds before calling this user again`,
      }
    }

    // Проверка 2: Количество активных звонков
    const activeCount = this.activeCallsCount.get(callerId)
    if (activeCount && activeCount.count >= this.maxActiveCalls) {
      this.logger.warn({
        '[canInitiateCall]': {
          reason: 'Max active calls reached',
          callerId,
          activeCount: activeCount.count,
          maxActiveCalls: this.maxActiveCalls,
        },
      })
      return {
        allowed: false,
        reason: `You can only have ${this.maxActiveCalls} active call${this.maxActiveCalls > 1 ? 's' : ''} at a time`,
      }
    }

    // Проверка 3: Общее количество звонков в минуту
    const attempts = this.callAttempts.get(callerId)
    if (attempts && attempts.resetAt > now) {
      if (attempts.count >= this.callsPerMinute) {
        this.logger.warn({
          '[canInitiateCall]': {
            reason: 'Calls per minute limit reached',
            callerId,
            count: attempts.count,
            limit: this.callsPerMinute,
          },
        })
        return {
          allowed: false,
          reason: `Too many calls. Maximum ${this.callsPerMinute} calls per minute`,
        }
      }
      attempts.count++
    } else {
      this.callAttempts.set(callerId, { count: 1, resetAt: now + 60 * 1000 })
    }

    // Проверка 4: Количество звонков одному пользователю в минуту
    const callsToUserAttempts = this.callsToUser.get(userKey)
    if (callsToUserAttempts && callsToUserAttempts.resetAt > now) {
      if (callsToUserAttempts.count >= this.callsToUserPerMinute) {
        this.logger.warn({
          '[canInitiateCall]': {
            reason: 'Calls to user per minute limit reached',
            callerId,
            calleeId,
            count: callsToUserAttempts.count,
            limit: this.callsToUserPerMinute,
          },
        })
        return {
          allowed: false,
          reason: `Too many calls to this user. Maximum ${this.callsToUserPerMinute} calls per minute`,
        }
      }
      callsToUserAttempts.count++
    } else {
      this.callsToUser.set(userKey, { count: 1, resetAt: now + 60 * 1000 })
    }

    return { allowed: true }
  }

  /**
   * Отмечает начало звонка
   */
  onCallStarted(callerId: UserId): void {
    const activeCount = this.activeCallsCount.get(callerId) || { count: 0 }
    activeCount.count++
    this.activeCallsCount.set(callerId, activeCount)

    this.logger.debug({
      '[onCallStarted]': {
        callerId,
        activeCalls: activeCount.count,
      },
    })
  }

  /**
   * Отмечает завершение звонка
   */
  onCallEnded(callerId: UserId): void {
    const activeCount = this.activeCallsCount.get(callerId)
    if (activeCount && activeCount.count > 0) {
      activeCount.count--
      if (activeCount.count === 0) {
        this.activeCallsCount.delete(callerId)
      } else {
        this.activeCallsCount.set(callerId, activeCount)
      }
    }

    this.logger.debug({
      '[onCallEnded]': {
        callerId,
        activeCalls: activeCount?.count || 0,
      },
    })
  }

  /**
   * Устанавливает cooldown после отклонения звонка
   */
  onCallRejected(callerId: UserId, calleeId: UserId): void {
    const userKey = `${callerId}:${calleeId}`
    const cooldownUntil = Date.now() + this.rejectedCallCooldownMs

    this.rejectedCallCooldowns.set(userKey, {
      callerId,
      calleeId,
      cooldownUntil,
    })

    this.logger.debug({
      '[onCallRejected]': {
        callerId,
        calleeId,
        cooldownUntil: new Date(cooldownUntil).toISOString(),
        cooldownSeconds: this.rejectedCallCooldownMs / 1000,
      },
    })
  }

  /**
   * Очищает истекшие записи
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now()
    let cleaned = 0

    // Очистка истекших попыток звонков
    this.callAttempts.forEach((attempt, userId) => {
      if (attempt.resetAt <= now) {
        this.callAttempts.delete(userId)
        cleaned++
      }
    })

    // Очистка истекших звонков одному пользователю
    this.callsToUser.forEach((attempt, key) => {
      if (attempt.resetAt <= now) {
        this.callsToUser.delete(key)
        cleaned++
      }
    })

    // Очистка истекших cooldown периодов
    this.rejectedCallCooldowns.forEach((cooldown, key) => {
      if (cooldown.cooldownUntil <= now) {
        this.rejectedCallCooldowns.delete(key)
        cleaned++
      }
    })

    if (cleaned > 0) {
      this.logger.debug({
        '[cleanupExpiredEntries]': {
          cleaned,
          remainingCallAttempts: this.callAttempts.size,
          remainingCallsToUser: this.callsToUser.size,
          remainingCooldowns: this.rejectedCallCooldowns.size,
        },
      })
    }
  }

  /**
   * Получает статистику для пользователя (для отладки)
   */
  getStats(callerId: UserId): {
    activeCalls: number
    callsInMinute: number
    callsToUserInMinute: Map<string, number>
  } {
    const activeCount = this.activeCallsCount.get(callerId)?.count || 0
    const attempts = this.callAttempts.get(callerId)
    const callsInMinute = attempts && attempts.resetAt > Date.now() ? attempts.count : 0

    const callsToUserInMinute = new Map<string, number>()
    this.callsToUser.forEach((attempt, key) => {
      if (key.startsWith(`${callerId}:`) && attempt.resetAt > Date.now()) {
        const calleeId = key.split(':')[1]
        callsToUserInMinute.set(calleeId, attempt.count)
      }
    })

    return {
      activeCalls: activeCount,
      callsInMinute,
      callsToUserInMinute,
    }
  }
}


