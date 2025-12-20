# API для голосовых звонков (VPN/Xray End-to-End)

## Обзор

Сервис голосовых звонков использует WebSocket для сигналинга и VPN канал с шифрованием xray для передачи медиа-трафика между двумя пользователями. После подтверждения звонка устанавливается зашифрованный VPN туннель через xray сервер.

## Подключение

### WebSocket Namespace

Подключитесь к WebSocket namespace `/call` с JWT токеном авторизации:

```javascript
import io from 'socket.io-client'

const socket = io('ws://your-gate-url/call', {
  auth: {
    token: 'your-jwt-token',
  },
  transports: ['websocket', 'polling'],
})
```

## События API

### Клиент → Сервер

#### `initiate-call`

Инициация нового звонка.

**Параметры:**

```typescript
{
  calleeId: string // ID пользователя, которому звоним
}
```

**Пример:**

```javascript
socket.emit('initiate-call', {
  calleeId: 'user-uuid-here',
})
```

#### `accept-call`

Принятие входящего звонка. После принятия сервер генерирует VPN конфигурации для обоих участников.

**Параметры:**

```typescript
{
  callId: string
}
```

**Пример:**

```javascript
socket.emit('accept-call', {
  callId: 'call-uuid',
})
```

#### `vpn-ready`

Уведомление сервера о том, что VPN канал установлен и готов к использованию.

**Параметры:**

```typescript
{
  callId: string
  localEndpoint?: string // Локальный IP адрес для P2P соединения (опционально)
}
```

**Пример:**

```javascript
socket.emit('vpn-ready', {
  callId: 'call-uuid',
  localEndpoint: '192.168.1.100', // опционально
})
```

#### `reject-call`

Отклонение входящего звонка.

**Параметры:**

```typescript
{
  callId: string
}
```

**Пример:**

```javascript
socket.emit('reject-call', {
  callId: 'call-uuid',
})
```

#### `hangup`

Завершение активного звонка.

**Параметры:**

```typescript
{
  callId: string
}
```

**Пример:**

```javascript
socket.emit('hangup', {
  callId: 'call-uuid',
})
```

### Сервер → Клиент

#### `call-initiated`

Получает инициатор звонка после успешной инициации.

**Параметры:**

```typescript
{
  callId: string
  callerId: string
  calleeId: string
}
```

**Обработка:**

```javascript
socket.on('call-initiated', (data) => {
  const { callId } = data
  // Ожидание принятия звонка
})
```

#### `incoming-call`

Получает вызываемый пользователь при входящем звонке.

**Параметры:**

```typescript
{
  callId: string
  callerId: string
  calleeId: string
}
```

**Обработка:**

```javascript
socket.on('incoming-call', (data) => {
  const { callId, callerId } = data
  // Показать уведомление о входящем звонке
  showIncomingCallNotification(data)
})
```

#### `call-accepted`

Получает инициатор после того, как вызываемый принял звонок.

**Параметры:**

```typescript
{
  callId: string
}
```

**Обработка:**

```javascript
socket.on('call-accepted', (data) => {
  const { callId } = data
  // Звонок принят, ожидание VPN конфигурации
})
```

#### `vpn-config-received`

Получает VPN конфигурацию xray для установки зашифрованного канала.

**Параметры:**

```typescript
{
  callId: string
  vpnServer: string
  vpnPort: number
  encryptionKey: string
  xrayConfig: {
    version: string
    log: { loglevel: string }
    inbounds: Array<{
      port: number
      protocol: string
      settings: Record<string, unknown>
      streamSettings?: Record<string, unknown>
    }>
    outbounds: Array<{
      protocol: string
      settings: Record<string, unknown>
      streamSettings?: Record<string, unknown>
    }>
  }
  peerEndpoint?: string
}
```

**Обработка:**

```javascript
socket.on('vpn-config-received', async (config) => {
  const { callId, xrayConfig, encryptionKey } = config
  // Сохранить конфигурацию и запустить xray клиент
  await setupXrayClient(xrayConfig)
  // После установки VPN соединения
  socket.emit('vpn-ready', { callId })
})
```

#### `vpn-connected`

Получает уведомление о том, что другой участник установил VPN соединение.

**Параметры:**

```typescript
{
  callId: string
  peerEndpoint?: string
}
```

**Обработка:**

```javascript
socket.on('vpn-connected', (data) => {
  const { callId, peerEndpoint } = data
  // VPN канал установлен, можно начинать передачу медиа
  startMediaStream(callId, peerEndpoint)
})
```

#### `call-rejected`

Получает при отклонении звонка.

**Параметры:**

```typescript
{
  callId: string
}
```

**Обработка:**

```javascript
socket.on('call-rejected', (data) => {
  const { callId } = data
  // Закрыть соединение и показать уведомление
  closeCall(callId)
  showNotification('Call rejected')
})
```

#### `call-hangup`

Получает при завершении звонка другим участником.

**Параметры:**

```typescript
{
  callId: string
}
```

**Обработка:**

```javascript
socket.on('call-hangup', (data) => {
  const { callId } = data
  // Закрыть VPN соединение и очистить ресурсы
  closeCall(callId)
})
```

#### `call-error`

Получает при возникновении ошибки.

**Параметры:**

```typescript
{
  message: string
}
```

**Возможные сообщения об ошибках:**

- `"Cannot call yourself"` - попытка позвонить самому себе
- `"User not found"` - пользователь не найден в системе
- `"User is offline"` - пользователь не подключен к WebSocket
- `"Call not found"` - звонок не найден (возможно, уже завершен)
- `"Not authorized for this call"` - нет прав на этот звонок
- `"Not authorized to accept this call"` - нет прав принять этот звонок

**Обработка:**

```javascript
socket.on('call-error', (error) => {
  console.error('Call error:', error.message)
  // Показать уведомление пользователю
  showErrorNotification(error.message)
})
```

## Рекомендации по организации фронтенда

### 1. Управление состоянием звонка

Рекомендуется создать отдельный модуль/класс для управления звонками:

```typescript
class CallManager {
  private socket: Socket
  private xrayProcess: ChildProcess | null = null
  private currentCallId: string | null = null
  private vpnConfig: IVpnConnectionConfig | null = null

  constructor(socket: Socket) {
    this.socket = socket
    this.setupEventListeners()
  }

  async initiateCall(calleeId: string): Promise<void> {
    this.socket.emit('initiate-call', { calleeId })
  }

  async acceptCall(callId: string): Promise<void> {
    this.socket.emit('accept-call', { callId })
  }

  private setupEventListeners(): void {
    this.socket.on('call-initiated', this.handleCallInitiated.bind(this))
    this.socket.on('incoming-call', this.handleIncomingCall.bind(this))
    this.socket.on('call-accepted', this.handleCallAccepted.bind(this))
    this.socket.on('vpn-config-received', this.handleVpnConfig.bind(this))
    this.socket.on('vpn-connected', this.handleVpnConnected.bind(this))
    this.socket.on('call-rejected', this.handleCallRejected.bind(this))
    this.socket.on('call-hangup', this.handleHangup.bind(this))
    this.socket.on('call-error', this.handleError.bind(this))
  }
}
```

### 2. Установка xray клиента

Для работы с xray необходимо установить xray-core на клиентском устройстве или использовать WebAssembly версию.

**Вариант 1: Нативный клиент (Node.js/Electron)**

```typescript
import { spawn } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function setupXrayClient(config: IXrayConfig): Promise<ChildProcess> {
  // Сохранить конфигурацию во временный файл
  const configPath = join(process.cwd(), 'xray-config.json')
  writeFileSync(configPath, JSON.stringify(config, null, 2))

  // Запустить xray с конфигурацией
  const xrayProcess = spawn('xray', ['-config', configPath], {
    stdio: 'pipe',
  })

  xrayProcess.on('error', (error) => {
    console.error('Xray process error:', error)
  })

  return xrayProcess
}
```

**Вариант 2: WebAssembly (для браузера)**

Для PWA приложений можно использовать xray-core WebAssembly версию или альтернативные решения.

### 3. Работа с VPN туннелем

После установки xray клиента, медиа-трафик должен проходить через VPN туннель:

```typescript
async function startMediaStream(callId: string, peerEndpoint?: string): Promise<void> {
  // Получить доступ к микрофону
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  })

  // Настроить WebRTC или другой протокол для передачи через VPN
  // Медиа-трафик будет автоматически проходить через xray туннель
  // если приложение настроено использовать локальный SOCKS прокси (порт 10808)
}
```

### 4. Настройка прокси для медиа-трафика

Для передачи медиа через VPN туннель, приложение должно использовать локальный SOCKS прокси, созданный xray:

```typescript
// xray создает локальный SOCKS прокси на порту 10808
const proxyConfig = {
  protocol: 'socks5',
  host: '127.0.0.1',
  port: 10808,
}

// Настроить WebRTC или другой протокол для использования прокси
```

### 5. Обработка ошибок и переподключений

```typescript
// Обработка отключения WebSocket
socket.on('disconnect', () => {
  console.warn('WebSocket disconnected, attempting reconnect...')
  // Закрыть все активные звонки и VPN соединения
  this.closeAllCalls()
})

socket.on('connect', () => {
  console.log('WebSocket reconnected')
  // Возможно, нужно восстановить состояние
})

// Обработка ошибок VPN
private handleVpnError(error: Error): void {
  console.error('VPN connection error:', error)
  // Попытка восстановления или уведомление пользователя
  this.showError('VPN connection failed. Please try again.')
}
```

### 6. Управление медиа-потоками

```typescript
// Получение доступа к микрофону
async requestMediaAccess(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })
  } catch (error) {
    console.error('Error accessing media devices:', error)
    throw new Error('Microphone access denied')
  }
}

// Остановка медиа-потоков
private stopMediaStreams(): void {
  if (this.localStream) {
    this.localStream.getTracks().forEach((track) => track.stop())
    this.localStream = null
  }
}
```

### 7. UI состояния звонка

Рекомендуется использовать state machine для управления состояниями:

```typescript
enum CallState {
  IDLE = 'idle',
  INITIATING = 'initiating',
  RINGING = 'ringing',
  ACCEPTING = 'accepting',
  CONNECTING_VPN = 'connecting-vpn',
  VPN_CONNECTED = 'vpn-connected',
  ACTIVE = 'active',
  ENDED = 'ended',
  REJECTED = 'rejected',
  ERROR = 'error',
}

class CallStateManager {
  private state: CallState = CallState.IDLE

  setState(newState: CallState): void {
    this.state = newState
    this.updateUI()
  }

  private updateUI(): void {
    switch (this.state) {
      case CallState.IDLE:
        // Показать кнопку "Позвонить"
        break
      case CallState.INITIATING:
        // Показать индикатор "Установка соединения..."
        break
      case CallState.RINGING:
        // Показать "Звонок идет..."
        break
      case CallState.CONNECTING_VPN:
        // Показать "Установка VPN соединения..."
        break
      case CallState.VPN_CONNECTED:
        // Показать "VPN установлен, подключение..."
        break
      case CallState.ACTIVE:
        // Показать активный звонок с кнопками управления
        break
      // ...
    }
  }
}
```

### 8. Очистка ресурсов

```typescript
async hangup(): Promise<void> {
  if (this.currentCallId) {
    this.socket.emit('hangup', { callId: this.currentCallId })
  }

  // Остановить xray процесс
  if (this.xrayProcess) {
    this.xrayProcess.kill()
    this.xrayProcess = null
  }

  // Остановить медиа-потоки
  this.stopMediaStreams()

  this.currentCallId = null
  this.vpnConfig = null
  this.setState(CallState.IDLE)
}

// Очистка при размонтировании компонента
componentWillUnmount(): void {
  this.hangup()
  this.socket.off('call-initiated')
  this.socket.off('incoming-call')
  // ... отписаться от всех событий
}
```

## Конфигурация VPN сервера

Для работы сервиса необходимо настроить xray сервер с поддержкой динамических пользователей. Сервер должен:

1. Принимать соединения на порту, указанном в `VPN_PORT`
2. Поддерживать протокол VLESS с WebSocket транспортом
3. Использовать TLS для шифрования
4. Динамически создавать пользователей для каждого звонка

Пример конфигурации xray сервера:

```json
{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "ws",
        "security": "tls",
        "wsSettings": {
          "path": "/call"
        },
        "tlsSettings": {
          "certificates": [
            {
              "certificateFile": "/path/to/cert.pem",
              "keyFile": "/path/to/key.pem"
            }
          ]
        }
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom"
    }
  ]
}
```

## Переменные окружения

На сервере необходимо настроить следующие переменные окружения:

```bash
VPN_SERVER=vpn.example.com  # Адрес VPN сервера
VPN_PORT=443               # Порт VPN сервера
```

## Безопасность

1. **JWT токены**: Всегда передавайте JWT токен при подключении к WebSocket
2. **Валидация**: Сервер проверяет существование пользователей и права доступа
3. **HTTPS/WSS**: Используйте защищенное соединение в production
4. **VPN шифрование**: xray обеспечивает end-to-end шифрование через VPN туннель
5. **Уникальные ключи**: Каждый звонок получает уникальный ключ шифрования
6. **Временные конфигурации**: VPN конфигурации действительны только во время звонка

## Пример полного потока звонка

```typescript
// 1. Инициатор: начало звонка
callManager.initiateCall('callee-user-id')

// 2. Инициатор получает call-initiated
socket.on('call-initiated', (data) => {
  // Ожидание принятия звонка
})

// 3. Вызываемый получает incoming-call
socket.on('incoming-call', (data) => {
  // Показать уведомление
  showIncomingCallNotification(data)
  // Принять звонок
  socket.emit('accept-call', { callId: data.callId })
})

// 4. Оба участника получают vpn-config-received
socket.on('vpn-config-received', async (config) => {
  // Установить xray клиент с полученной конфигурацией
  await setupXrayClient(config.xrayConfig)
  // Уведомить сервер о готовности
  socket.emit('vpn-ready', { callId: config.callId })
})

// 5. Оба участника получают vpn-connected
socket.on('vpn-connected', (data) => {
  // VPN канал установлен, начать передачу медиа
  startMediaStream(data.callId, data.peerEndpoint)
})

// 6. Медиа-трафик передается через зашифрованный VPN туннель
```

## Альтернативные решения

Если использование xray на клиенте невозможно, рассмотрите альтернативы:

1. **WireGuard**: Более легковесный VPN протокол для P2P соединений
2. **TURN сервер с шифрованием**: Использование TURN сервера с дополнительным шифрованием
3. **SFU (Selective Forwarding Unit)**: Серверная архитектура с шифрованием на уровне медиа

