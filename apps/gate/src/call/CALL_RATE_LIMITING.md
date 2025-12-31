# Rate Limiting для звонков

## Обзор

Реализован rate limiting для защиты от злоупотреблений системой звонков:
- Ограничение частоты звонков
- Ограничение количества одновременных звонков
- Cooldown период после отклонения звонка
- Ограничение звонков одному пользователю

## Настройки

Все настройки вынесены в переменные окружения:

```env
# Максимальное количество звонков пользователя в минуту
CALL_RATE_LIMIT_PER_MINUTE=3

# Максимальное количество звонков одному пользователю в минуту
CALL_RATE_LIMIT_TO_USER_PER_MINUTE=3

# Максимальное количество одновременных активных звонков
CALL_MAX_ACTIVE_CALLS=1

# Cooldown период после отклонения звонка (в секундах)
CALL_REJECTED_COOLDOWN_SECONDS=30
```

## Лимиты

### 1. Общее количество звонков в минуту

**Переменная:** `CALL_RATE_LIMIT_PER_MINUTE`  
**По умолчанию:** 3  
**Описание:** Максимальное количество звонков, которые пользователь может инициировать в течение одной минуты.

**Пример:**
- Пользователь может сделать 3 звонка в минуту
- При попытке сделать 4-й звонок в течение минуты получит ошибку: "Too many calls. Maximum 3 calls per minute"

### 2. Количество звонков одному пользователю в минуту

**Переменная:** `CALL_RATE_LIMIT_TO_USER_PER_MINUTE`  
**По умолчанию:** 3  
**Описание:** Максимальное количество звонков, которые можно сделать одному конкретному пользователю в течение одной минуты.

**Пример:**
- Пользователь A может позвонить пользователю B максимум 3 раза в минуту
- При попытке позвонить 4-й раз получит ошибку: "Too many calls to this user. Maximum 3 calls per minute"

### 3. Максимальное количество одновременных активных звонков

**Переменная:** `CALL_MAX_ACTIVE_CALLS`  
**По умолчанию:** 1  
**Описание:** Максимальное количество звонков, которые могут быть активны одновременно для одного пользователя.

**Пример:**
- Пользователь может иметь только 1 активный звонок одновременно
- При попытке инициировать новый звонок, пока есть активный, получит ошибку: "You can only have 1 active call at a time"

### 4. Cooldown после отклонения звонка

**Переменная:** `CALL_REJECTED_COOLDOWN_SECONDS`  
**По умолчанию:** 30  
**Описание:** Период времени в секундах, в течение которого нельзя позвонить пользователю после того, как он отклонил ваш звонок.

**Пример:**
- Пользователь A звонит пользователю B
- Пользователь B отклоняет звонок
- Пользователь A не может позвонить пользователю B в течение 30 секунд
- При попытке позвонить получит ошибку: "Please wait X seconds before calling this user again"

## Реализация

### Сервис

`CallRateLimiterService` (`apps/gate/src/call/services/call-rate-limiter.service.ts`)

**Методы:**
- `canInitiateCall(callerId, calleeId)` - проверяет, может ли пользователь инициировать звонок
- `onCallStarted(callerId)` - отмечает начало звонка
- `onCallEnded(callerId)` - отмечает завершение звонка
- `onCallRejected(callerId, calleeId)` - устанавливает cooldown после отклонения

### Интеграция

Rate limiter интегрирован в `CallWebSocketGateway`:

1. **Проверка при инициации звонка:**
   ```typescript
   const rateLimitCheck = this.rateLimiter.canInitiateCall(callerId, calleeId)
   if (!rateLimitCheck.allowed) {
     client.emit(CallEvent.CALL_ERROR, { message: rateLimitCheck.reason })
     return
   }
   ```

2. **Отслеживание активных звонков:**
   - `onCallStarted()` вызывается при успешной инициации
   - `onCallEnded()` вызывается при завершении звонка (hangup, reject, disconnect)

3. **Cooldown после отклонения:**
   - `onCallRejected()` вызывается при отклонении звонка вызываемым пользователем

## Очистка данных

Сервис автоматически очищает истекшие записи каждую минуту:
- Истекшие счетчики звонков
- Истекшие cooldown периоды
- Неиспользуемые записи

## Логирование

Все события rate limiting логируются:
- Предупреждения при превышении лимитов
- Отладочная информация о состоянии лимитов
- Информация о cooldown периодах

## Примеры использования

### Проверка лимитов

```typescript
const result = rateLimiter.canInitiateCall('user-1', 'user-2')
if (!result.allowed) {
  console.log('Cannot initiate call:', result.reason)
}
```

### Получение статистики

```typescript
const stats = rateLimiter.getStats('user-1')
console.log('Active calls:', stats.activeCalls)
console.log('Calls in minute:', stats.callsInMinute)
console.log('Calls to users:', stats.callsToUserInMinute)
```

## Настройка для разных окружений

### Development
```env
CALL_RATE_LIMIT_PER_MINUTE=10
CALL_MAX_ACTIVE_CALLS=3
CALL_REJECTED_COOLDOWN_SECONDS=10
```

### Production
```env
CALL_RATE_LIMIT_PER_MINUTE=3
CALL_MAX_ACTIVE_CALLS=1
CALL_REJECTED_COOLDOWN_SECONDS=30
```

## Безопасность

Rate limiting защищает от:
- ✅ DoS атак через спам звонков
- ✅ Злоупотребления системой
- ✅ Перегрузки сервера
- ✅ Надоедливых звонков (cooldown после отклонения)

## Мониторинг

Рекомендуется отслеживать:
- Количество заблокированных попыток звонков
- Пользователей с высокой частотой звонков
- Частоту срабатывания cooldown периодов


