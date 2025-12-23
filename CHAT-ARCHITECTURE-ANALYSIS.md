# Анализ архитектуры метода createChat

## Текущее состояние

### ✅ Реализовано:

1. **Сущности базы данных:**
   - `Chat` (`libs/entitiesPG/src/chat.entity.ts`)
   - `ChatParticipant` (`libs/entitiesPG/src/chatParticipant.entity.ts`)

2. **Типы и интерфейсы:**
   - `IChatDB`, `IChatService` (`libs/types/src/Chat.ts`)
   - `IChatParticipantDB` (`libs/types/src/ChatParticipant.ts`)
   - Константы `CHAT_QUEUE`, `ChatType` (`libs/constants/src/chat.ts`)

3. **Структура папок:**
   - `apps/chat/` - папка для chat service (пока пустая)
   - `apps/gate/src/chat/` - папка для chat контроллеров в gate (пока пустая)

### ❌ Не реализовано:

- Chat service (микросервис)
- Chat контроллеры в gate
- Chat модуль в gate
- RPC интеграция для chat service
- DTO для chat операций

## Предполагаемая архитектура (на основе паттерна message service)

### 1. Поток запроса createChat

```
Frontend (MIN-PWA)
    ↓ HTTP POST /chat
Gate Service (apps/gate)
    ↓ RPC через NATS (queue: 'chat', pattern: 'chatCreate')
Chat Service (apps/chat)
    ↓ TypeORM
PostgreSQL (tables: chats, chat_participants)
```

### 2. Структура файлов (по аналогии с message service)

#### Gate Service (`apps/gate/src/chat/`)

**controllers/chat.controller.ts**

```typescript
@Controller({ path: 'chat' })
export class ChatController {
  @Inject(IChatService)
  private readonly chatService: IChatService

  @Post()
  public async createChat(@ReqUser() user: IUserDB, @Body() body: ChatCreateDtoRequest) {
    const requestData = {
      ...body,
      creator: user.userId,
    }
    return await this.chatService.createChat(requestData)
  }
}
```

**dto/chatCreate.dto.request.ts**

```typescript
export class ChatCreateDtoRequest implements IChatCreateRequest {
  @IsUUID()
  senderId: string

  @IsEnum(ChatType)
  type: ChatType

  @IsOptional()
  @IsString()
  message?: string
}
```

**chat.module.ts**

```typescript
@Module({
  imports: [RpcModule.register({ name: IChatService, queueName: CHAT_QUEUE }), AuthModule],
  controllers: [ChatController],
})
export class ChatModule {}
```

#### Chat Service (`apps/chat/src/chat/`)

**controllers/chat.controller.ts** (RPC контроллер)

```typescript
@Controller()
export class ChatController implements Pick<IChatService, 'createChat'> {
  @Inject(ChatService)
  private readonly chatService: ChatService

  @MessagePattern('chatCreate')
  public async createChat(@Payload() payload: ChatCreateRequestDto): ServiceResponse<IChatCreateResponse> {
    return await this.chatService.createChat(payload)
  }
}
```

**services/chat.service.ts**

```typescript
@Injectable()
export class ChatService implements IChatService {
  @InjectRepository(Chat, dataSourceName)
  private readonly chatRepository: Repository<Chat>

  @InjectRepository(ChatParticipant, dataSourceName)
  private readonly chatParticipantRepository: Repository<ChatParticipant>

  public async createChat(params: ChatCreateRequestDto): ServiceResponse<IChatCreateResponse> {
    // 1. Создать запись в таблице chats
    const chat = this.chatRepository.create({
      creator: params.creator,
      senderId: params.senderId,
      type: params.type,
      message: params.message || '',
      messageStatus: MessageStatus.sent,
    })
    const savedChat = await this.chatRepository.save(chat)

    // 2. Создать участников чата в таблице chat_participants
    const participants = [
      { chatId: savedChat.chatId, userId: params.creator },
      { chatId: savedChat.chatId, userId: params.senderId },
    ]
    await this.chatParticipantRepository.save(participants)

    return {
      data: { chat: ChatService.serialize(savedChat) },
      status: HttpStatus.CREATED,
    }
  }
}
```

### 3. Типы для IChatService

**libs/types/src/Chat.ts** (нужно дополнить)

```typescript
export interface IChatCreateRequest {
  creator: UserId
  senderId: SenderId
  type: ChatType
  message?: string
}

export type IChatCreateResponse = Response<{ chat: IChatDB }>

export abstract class IChatService {
  createChat(_request: IChatCreateRequest): ServiceResponse<IChatCreateResponse> {
    throw new NotImplementedException()
  }
}
```

### 4. Интеграция в Gate AppModule

**apps/gate/src/app.module.ts**

```typescript
@Module({
  imports: [
    // ... existing imports
    ChatModule,  // Добавить
  ],
})
```

### 5. Конфигурация Chat Service

**apps/chat/src/app.module.ts** (создать по аналогии с message)

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({...}),
    TypeOrmModule.forRootAsync({...}),
    TraceIdRmqModule,
    LoggingModule,
    ChatModule,
  ],
})
```

## Ключевые моменты реализации

### RPC коммуникация

1. **Gate Service:**
   - Использует `RpcModule.register({ name: IChatService, queueName: CHAT_QUEUE })`
   - Создает Proxy объект, который перехватывает вызовы методов
   - Отправляет сообщение в NATS с паттерном `chatCreate`

2. **Chat Service:**
   - Слушает NATS очередь `chat`
   - Обрабатывает паттерн `chatCreate` через `@MessagePattern('chatCreate')`
   - Выполняет бизнес-логику и возвращает результат

### База данных

1. **Таблица `chats`:**
   - `chatId` (UUID, PK)
   - `creator` (UUID) - создатель чата
   - `senderId` (UUID) - второй участник
   - `type` (ChatType) - тип чата
   - `message` (varchar) - последнее сообщение
   - `messageStatus` (MessageStatus)
   - `createdAt` (timestamp)

2. **Таблица `chat_participants`:**
   - `chatId` (UUID, PK)
   - `userId` (UUID) - участник чата
   - `createdAt` (timestamp)

### Транзакции

При создании чата нужно:

1. Создать запись в `chats`
2. Создать записи в `chat_participants` для всех участников
3. Использовать транзакцию для атомарности операций

## Следующие шаги для реализации

1. ✅ Определить типы и интерфейсы в `libs/types/src/Chat.ts`
2. ✅ Создать DTO в `apps/gate/src/chat/dto/`
3. ✅ Создать контроллер в `apps/gate/src/chat/controllers/`
4. ✅ Создать ChatModule в gate
5. ✅ Зарегистрировать ChatModule в AppModule
6. ✅ Создать chat service микросервис
7. ✅ Реализовать RPC контроллер в chat service
8. ✅ Реализовать ChatService с бизнес-логикой
9. ✅ Добавить chat service в docker-compose
10. ✅ Добавить chat service в nest-cli.json

## Сравнение с message service

| Аспект             | Message Service            | Chat Service (предполагаемый) |
| ------------------ | -------------------------- | ----------------------------- |
| Gate Controller    | ✅ MessageController       | ❌ ChatController             |
| Gate Module        | ✅ MessageModule           | ❌ ChatModule                 |
| RPC Queue          | `MESSAGE_QUEUE`            | `CHAT_QUEUE`                  |
| RPC Pattern        | `messageCreate`            | `chatCreate`                  |
| Service App        | ✅ apps/message            | ❌ apps/chat                  |
| Service Controller | ✅ MessageController (RPC) | ❌ ChatController (RPC)       |
| Service Service    | ✅ MessageService          | ❌ ChatService                |
| DB Tables          | `messages`                 | `chats`, `chat_participants`  |
| Relations          | Один к одному              | Один ко многим (participants) |
