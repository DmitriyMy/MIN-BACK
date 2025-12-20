# Диаграмма потока createChat

## Полный поток запроса

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (MIN-PWA)                        │
│  POST /chat                                                      │
│  Headers: Authorization: Bearer <JWT_TOKEN>                     │
│  Body: { senderId: "uuid", type: 121, message?: "..." }        │
└────────────────────────────┬────────────────────────────────────┘
                              │ HTTP Request
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GATE SERVICE (apps/gate)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ChatController.createChat()                               │  │
│  │  - Валидация DTO                                          │  │
│  │  - Извлечение user из JWT (@ReqUser())                    │  │
│  │  - Формирование requestData:                              │  │
│  │    { creator: user.userId, ...body }                      │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ IChatService.createChat(requestData)                     │  │
│  │  (Proxy объект из RpcModule)                             │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ RpcModule Proxy Handler                                  │  │
│  │  - Создает NATS Client                                   │  │
│  │  - Отправляет сообщение:                                  │  │
│  │    Pattern: "chatCreate"                                  │  │
│  │    Queue: "chat"                                          │  │
│  │    Payload: requestData                                   │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────────────┘
                         │ NATS Message
                         │ Pattern: "chatCreate"
                         │ Queue: "chat"
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NATS Message Broker                           │
│  - Маршрутизация сообщения                                       │
│  - Балансировка нагрузки (если несколько инстансов chat)        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CHAT SERVICE (apps/chat)                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ChatController (RPC)                                     │  │
│  │  @MessagePattern('chatCreate')                          │  │
│  │  - Получает payload из NATS                              │  │
│  │  - Логирование входящего запроса                         │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ChatService.createChat(payload)                           │  │
│  │  - Валидация данных                                       │  │
│  │  - Начало транзакции                                      │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ 1. Создание записи в таблице chats                 │  │  │
│  │  │    - chatId (UUID, auto-generated)                 │  │  │
│  │  │    - creator (из payload)                           │  │  │
│  │  │    - senderId (из payload)                          │  │  │
│  │  │    - type (из payload)                              │  │  │
│  │  │    - message (из payload или '')                    │  │  │
│  │  │    - messageStatus (MessageStatus.sent)             │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ 2. Создание участников в chat_participants         │  │  │
│  │  │    - { chatId, userId: creator }                  │  │  │
│  │  │    - { chatId, userId: senderId }                 │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  - Коммит транзакции                                     │  │
│  │  - Сериализация результата                              │  │
│  │  - Возврат ServiceResponse                              │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────────────┘
                         │ ServiceResponse
                         │ { data: { chat: IChatDB }, status: 201 }
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NATS Message Broker                           │
│  - Возврат ответа в очередь                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GATE SERVICE (apps/gate)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ RpcModule Proxy Handler                                  │  │
│  │  - Получение ответа из NATS                              │  │
│  │  - Обработка ошибок (если есть)                          │  │
│  │  - Возврат результата в ChatController                   │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ChatController.createChat()                              │  │
│  │  - Логирование ответа                                    │  │
│  │  - Возврат HTTP Response                                 │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────────────┘
                         │ HTTP Response
                         │ Status: 201 Created
                         │ Body: { data: { chat: {...} }, status: 201 }
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (MIN-PWA)                        │
│  - Получение ответа                                              │
│  - Обновление UI                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Детализация компонентов

### 1. Gate Service - ChatController

**Файл:** `apps/gate/src/chat/controllers/chat.controller.ts`

```typescript
@Controller({ path: 'chat' })
@UseGuards(JwtAuthGuard)
export class ChatController {
  @Inject(IChatService)
  private readonly chatService: IChatService

  @Post()
  async createChat(
    @ReqUser() user: IUserDB,
    @Body() body: ChatCreateDtoRequest
  ) {
    // user.userId автоматически извлекается из JWT токена
    const requestData = {
      creator: user.userId,  // Текущий пользователь - создатель чата
      senderId: body.senderId,  // Второй участник
      type: body.type,
      message: body.message,
    }
    
    // Вызов через RPC Proxy
    return await this.chatService.createChat(requestData)
  }
}
```

### 2. RPC Module - Proxy Handler

**Файл:** `libs/infrastructure/src/rpc/rpc.module.ts`

```typescript
// При вызове chatService.createChat(requestData):
// 1. Proxy перехватывает вызов метода 'createChat'
// 2. Создает NATS Client
// 3. Отправляет сообщение:
natsClient.send('chatCreate', requestData)
// 4. Ожидает ответ через firstValueFrom()
// 5. Возвращает результат
```

### 3. Chat Service - RPC Controller

**Файл:** `apps/chat/src/chat/controllers/chat.controller.ts`

```typescript
@Controller()
export class ChatController {
  @MessagePattern('chatCreate')  // Слушает паттерн из NATS
  async createChat(@Payload() payload: ChatCreateRequestDto) {
    // payload содержит: { creator, senderId, type, message }
    return await this.chatService.createChat(payload)
  }
}
```

### 4. Chat Service - Business Logic

**Файл:** `apps/chat/src/chat/services/chat.service.ts`

```typescript
@Injectable()
export class ChatService {
  async createChat(params: ChatCreateRequestDto) {
    // Транзакция для атомарности
    return await this.dataSource.transaction(async (manager) => {
      // 1. Создать чат
      const chat = manager.create(Chat, {
        creator: params.creator,
        senderId: params.senderId,
        type: params.type,
        message: params.message || '',
        messageStatus: MessageStatus.sent,
      })
      const savedChat = await manager.save(chat)

      // 2. Создать участников
      const participants = [
        manager.create(ChatParticipant, {
          chatId: savedChat.chatId,
          userId: params.creator,
        }),
        manager.create(ChatParticipant, {
          chatId: savedChat.chatId,
          userId: params.senderId,
        }),
      ]
      await manager.save(participants)

      return {
        data: { chat: this.serialize(savedChat) },
        status: HttpStatus.CREATED,
      }
    })
  }
}
```

## Последовательность операций в БД

```
BEGIN TRANSACTION;

  INSERT INTO chats (chat_id, creator, sender_id, type, message, message_status, created_at)
  VALUES (gen_random_uuid(), 'creator-uuid', 'sender-uuid', 121, '', 0, NOW());

  INSERT INTO chat_participants (chat_id, user_id, created_at)
  VALUES ('chat-uuid', 'creator-uuid', NOW());

  INSERT INTO chat_participants (chat_id, user_id, created_at)
  VALUES ('chat-uuid', 'sender-uuid', NOW());

COMMIT;
```

## Обработка ошибок

### В Gate Service:
- Валидация DTO (class-validator)
- JWT авторизация (JwtAuthGuard)
- Обработка RPC ошибок (ServiceResponse с status)

### В Chat Service:
- Валидация payload
- Проверка существования пользователей
- Проверка дубликатов чата
- Транзакционные ошибки (rollback)

## Логирование

Каждый компонент логирует:
1. **Gate Controller:** входящий запрос, user, body
2. **RPC Module:** отправка/получение RPC сообщений
3. **Chat RPC Controller:** получение payload
4. **Chat Service:** бизнес-логика, операции с БД

## Метрики и мониторинг

- Время выполнения RPC запроса
- Количество созданных чатов
- Ошибки валидации
- Ошибки БД
- NATS latency

