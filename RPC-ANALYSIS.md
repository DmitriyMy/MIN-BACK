# Анализ работы RPC в проекте MIN-BACK

## Обзор архитектуры

Проект использует микросервисную архитектуру с **NATS** в качестве брокера сообщений для межсервисного взаимодействия через RPC (Remote Procedure Call). Основная архитектура состоит из:

- **Gate Service** - API Gateway (HTTP сервер + WebSocket)
- **Микросервисы**: `auth`, `user`, `chat`, `message`, `notification`
- **NATS** - брокер сообщений для RPC коммуникации

## Компоненты RPC системы

### 1. RPC Клиент (RpcModule)

**Расположение**: `libs/infrastructure/src/rpc/rpc.module.ts`

#### Принцип работы:

```typescript
RpcModule.register<T>({ name: InjectionToken<T>, queueName: string })
```

Модуль создает динамический RPC клиент на основе интерфейса сервиса (`IUserService`, `IChatService`, и т.д.) используя **JavaScript Proxy**:

1. **Proxy-обертка**: Создает объект-прокси, который перехватывает вызовы методов
2. **Динамическая генерация**: При вызове метода (например, `userService.getUser()`) создается NATS клиент
3. **Отправка запроса**: Использует `natsClient.send(methodName, payload)` для отправки сообщения в очередь NATS
4. **Ожидание ответа**: Использует `firstValueFrom()` из RxJS для получения ответа

#### Особенности:

- ✅ Типобезопасность через TypeScript интерфейсы
- ✅ Автоматическое логирование запросов/ответов
- ✅ Обработка ошибок с возвратом структурированного ответа
- ⚠️ **Проблема**: Клиент создается при каждом вызове метода (нет переиспользования соединения)

#### Использование в Gate Service:

```typescript
// В модуле
imports: [RpcModule.register({ name: IUserService, queueName: USER_QUEUE })]

// В контроллере
@Inject(IUserService)
private readonly userService: IUserService

// Вызов
const response = await this.userService.getUser(requestData)
```

### 2. RPC Серверы (Микросервисы)

**Расположение**: `apps/{service}/src/main.ts`

#### Запуск микросервиса:

```typescript
bootstrapNatsMicroservice(AppModule, QUEUE_NAME)
```

Функция `bootstrapNatsMicroservice` (из `libs/infrastructure/src/bootstrap/bootstrap-nats-microservice.ts`):

1. Создает NestJS микросервис с транспортом `Transport.NATS`
2. Подключается к NATS серверу (`NATS_URL` из env)
3. Подписывается на очередь (`queue: queueName`)
4. Настраивает глобальные pipes для валидации
5. Настраивает обработку исключений

#### Обработчики RPC запросов:

**Расположение**: `apps/{service}/src/{service}/controllers/{service}.controller.ts`

Контроллеры используют декоратор `@MessagePattern()` для обработки RPC запросов:

```typescript
@Controller()
export class UserController {
  @MessagePattern('getUser')
  public async getUser(@Payload() payload: DTO.GetUserRequestDto) {
    // Обработка запроса
    return response
  }
}
```

**Соответствие паттерн ↔ метод интерфейса**:
- Паттерн сообщения = имя метода интерфейса
- Например: `'getUser'` → `IUserService.getUser()`

### 3. Интерфейсы сервисов

**Расположение**: `libs/types/src/{Service}.ts`

Интерфейсы определяют контракт между клиентом и сервером:

```typescript
export abstract class IUserService {
  getUser(_request: IGetUserRequest): ServiceResponse<SingleUserResponse> {
    throw new NotImplementedException()
  }
}
```

**Важно**: Используются абстрактные классы, а не интерфейсы TypeScript, чтобы их можно было использовать как InjectionToken в NestJS.

## Транспорт: NATS

### Конфигурация NATS:

- **URL**: `NATS_URL` из переменных окружения (например, `nats://localhost:4222`)
- **Очереди** (из `libs/constants/src/`):
  - `USER_QUEUE = 'user'`
  - `CHAT_QUEUE = 'chat'`
  - `MESSAGE_QUEUE = 'message'`
  - `AUTH_QUEUE = 'auth'`
  - `NOTIFICATION_QUEUE = 'notification'`

### Особенности NATS:

- ✅ Pub/Sub модель с очередями (queue groups)
- ✅ Durable queues для надежности
- ✅ Request-Reply паттерн через `send()` метод
- ✅ Легковесный и быстрый протокол

## Trace-ID и логирование

### HTTP (Gate Service):

**Модуль**: `TraceIdHttpModule`

- Извлекает `traceId` из заголовка `x-request-id`
- Если отсутствует - генерирует новый UUID
- Сохраняет в CLS (Continuation Local Storage) через `nestjs-cls`
- Добавляет в response headers

### RPC (Микросервисы):

**Модуль**: `TraceIdRmqModule`

- Использует **interceptor** для RPC контекста
- Извлекает `traceId` из headers сообщения NATS
- Сохраняет в CLS для использования в логах

**Проблема**: Класс `ClientNatsWithTraceId` не реализует передачу trace-id в headers!

Текущая реализация:
```typescript
export class ClientNatsWithTraceId extends ClientNats {
  protected publish(message: ReadPacket, callback: (packet: WritePacket) => unknown): () => void {
    return super.publish(message, callback)  // НЕ передает trace-id!
  }
}
```

**Рекомендация**: Реализовать передачу trace-id из CLS в headers NATS сообщения.

### Логирование:

**Сервис**: `PinoLoggerService`

- Автоматически добавляет `traceId` из CLS в каждый лог
- Формат: `{ traceId: string, msg: unknown, context?: string }`

## Схема взаимодействия

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ HTTP/WebSocket
       ▼
┌─────────────────────────────────────┐
│         Gate Service                │
│  ┌───────────────────────────────┐  │
│  │  HTTP Controllers             │  │
│  │  @Inject(IUserService)        │  │
│  │  userService.getUser()        │  │
│  └───────────┬───────────────────┘  │
│              │ RPC через NATS       │
└──────────────┼──────────────────────┘
               │
               ▼
        ┌──────────────┐
        │     NATS     │
        │   Broker     │
        └──────┬───────┘
               │
       ┌───────┴───────┬──────────┐
       │               │          │
       ▼               ▼          ▼
┌──────────┐   ┌──────────┐  ┌──────────┐
│   User   │   │   Chat   │  │ Message  │
│ Service  │   │ Service  │  │ Service  │
│          │   │          │  │          │
│ @Message │   │ @Message │  │ @Message │
│ Pattern  │   │ Pattern  │  │ Pattern  │
└──────────┘   └──────────┘  └──────────┘
```

## Примеры использования

### 1. Регистрация RPC клиента (Gate Service)

```typescript
// apps/gate/src/user/user-rpc.module.ts
const UserServiceRpc = RpcModule.register({ 
  name: IUserService, 
  queueName: USER_QUEUE 
})

@Global()
@Module({
  imports: [UserServiceRpc],
  exports: [UserServiceRpc],
})
export class UserRpcModule {}
```

### 2. Использование RPC клиента (Gate Controller)

```typescript
// apps/gate/src/user/controllers/user.controller.ts
@Controller('user')
export class UserController {
  @Inject(IUserService)
  private readonly userService: IUserService

  @Get()
  public async getUser(@ReqUser('userId') userId: UserId) {
    const response = await this.userService.getUser({ userId })
    return response
  }
}
```

### 3. Реализация RPC сервера (User Service)

```typescript
// apps/user/src/user/controllers/user.controller.ts
@Controller()
export class UserController implements Pick<IUserService, 'getUser'> {
  @Inject(UserService)
  private readonly userService: UserService

  @MessagePattern('getUser')
  public async getUser(@Payload() payload: DTO.GetUserRequestDto) {
    return await this.userService.getUser(payload)
  }
}
```

## Проблемы и рекомендации

### ✅ Исправленные проблемы:

1. **✅ Переиспользование NATS клиента**
   - **Исправлено**: Реализовано кэширование клиентов через `Map` с ключом `queueName-NATS_URL`
   - Клиенты создаются один раз и переиспользуются для всех запросов к одной очереди

2. **✅ Передача trace-id в RPC**
   - **Исправлено**: Trace-id передается через `__metadata` в payload сообщения
   - Trace-id извлекается из CLS (Continuation Local Storage) при каждом запросе
   - На стороне сервера trace-id извлекается из `__metadata` или headers (обратная совместимость)
   - Обновлен `TraceIdRmqModule` для поддержки обоих способов

3. **✅ Таймауты для RPC вызовов**
   - **Исправлено**: Добавлен таймаут 5 секунд через RxJS `timeout()` оператор
   - При превышении таймаута возвращается ошибка `REQUEST_TIMEOUT` (408)

4. **✅ Retry механизм**
   - **Исправлено**: Реализован retry с 3 попытками и задержкой 1 секунда между попытками
   - Используется RxJS `retry()` оператор с конфигурируемыми параметрами
   - Логируются все попытки повтора для отладки

### Дополнительные улучшения:

- ✅ Интеграция с `ClsService` для получения trace-id из HTTP контекста
- ✅ Улучшенная обработка ошибок с разделением типов ошибок (таймаут, недоступность сервиса)
- ✅ Расширенное логирование для отладки RPC вызовов

### Технические детали реализации:

1. **Кэширование NATS клиентов**:
   - Используется глобальный `Map` для хранения клиентов
   - Ключ кэша: `${queueName}-${NATS_URL}`
   - Клиенты создаются один раз при первом обращении

2. **Передача trace-id**:
   - Trace-id добавляется в payload как `__metadata: { traceId }`
   - Извлекается из CLS через `ClsService.get('traceId')`
   - На сервере извлекается в `TraceIdRmqModule` interceptor
   - `__metadata` автоматически удаляется ValidationPipe (whitelist: true)

3. **Таймауты и retry**:
   - Таймаут: 5 секунд (константа `RPC_TIMEOUT_MS`)
   - Retry: 3 попытки с задержкой 1 секунда (константы `RPC_RETRY_ATTEMPTS`, `RPC_RETRY_DELAY_MS`)
   - Используются RxJS операторы: `timeout()`, `retry()`, `catchError()`

4. **Обработка ошибок**:
   - Таймауты возвращают статус `REQUEST_TIMEOUT` (408)
   - Остальные ошибки возвращают статус `SERVICE_UNAVAILABLE` (503)
   - Все ошибки логируются через `logError()`

## Заключение

Система RPC в проекте использует современный подход с TypeScript интерфейсами и Proxy для типобезопасности. Все выявленные проблемы были исправлены:

### Текущее состояние:

**Преимущества:**
- ✅ Типобезопасность через интерфейсы
- ✅ Автоматическое логирование с trace-id
- ✅ Использование NATS как надежного брокера
- ✅ **Полная поддержка trace-id для трассировки**
- ✅ **Переиспользование NATS соединений (кэширование)**
- ✅ **Таймауты для предотвращения зависаний**
- ✅ **Retry механизм для повышения надежности**
- ✅ Улучшенная обработка ошибок

**Конфигурация:**
- Таймаут RPC: 5 секунд
- Количество retry попыток: 3
- Задержка между попытками: 1 секунда

Система готова к использованию в production среде и обеспечивает надежное межсервисное взаимодействие.

