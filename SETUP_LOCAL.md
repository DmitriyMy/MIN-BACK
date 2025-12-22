# Настройка локальной разработки

## Быстрая настройка

### Для локальной разработки (приложения вне Docker)

Для автоматической настройки `.env` файла для локальной разработки выполните:

```bash
./update-env-for-local.sh
```

Или вручную скопируйте `example.env` в `.env` и обновите значения.

**Важно:** Используйте `localhost` для подключения к сервисам в Docker:

- `PG_DB_HOST=localhost`
- `NATS_URL=nats://localhost:4222`

### Для Docker разработки (все сервисы в Docker)

Файл `dev.docker-compose.yaml` автоматически переопределяет переменные окружения для Docker контейнеров:

- `PG_DB_HOST=postgres` (имя сервиса)
- `NATS_URL=nats://nats:4222` (имя сервиса)

Поэтому ваш `.env` файл может содержать значения для локальной разработки, а Docker Compose автоматически использует правильные значения внутри контейнеров.

## Настройка .env файла вручную

Создайте или обновите файл `.env` в корне проекта со следующим содержимым:

```env
# Database Configuration (PostgreSQL в Docker)
PG_DB_HOST=localhost
PG_DB_PORT=5434
PG_DB_NAME=postgres
PG_DB_USER=postgres
PG_DB_PASSWORD=postgres

# Gate Service Configuration
GATE_APP_HOST=0.0.0.0
GATE_APP_PORT=3000
SWAGGER_ENABLED=true

# Environment
NODE_ENV=dev
LOGGER_MIN_LEVEL=debug

# NATS Configuration (NATS в Docker)
NATS_URL=nats://localhost:4222

# JWT Configuration
JWT_AUTH_EXPIRE=1d
JWT_AUTH_SECRET=SECRET1
JWT_EMAIL_EXPIRE=1d
JWT_EMAIL_SECRET=SECRET2

# Mail Configuration (для notification service)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM_NAME=FreeFrog
MAIL_FROM_ADDRESS=noreply@freefrog.tech
```

**Важно:** Замените значения `MAIL_USER`, `MAIL_PASS` и `MAIL_FROM_ADDRESS` на реальные значения для вашей почтовой службы.

## Запуск инфраструктуры (Docker)

Для локальной разработки необходимо запустить только инфраструктурные сервисы (PostgreSQL и NATS):

```bash
# Запуск только инфраструктуры
docker compose --env-file .env -f dev.docker-compose.yaml up postgres nats -d

# Или запуск всех сервисов в Docker
docker compose --env-file .env -f dev.docker-compose.yaml up --build
```

## Запуск приложений локально (без Docker)

После запуска инфраструктуры можно запускать приложения локально:

```bash
# Gate service
npm run start:dev:gate
# или
nest start gate --watch

# Auth service
nest start auth --watch

# User service
nest start user --watch

# Message service
nest start message --watch

# Notification service
nest start notification --watch
```

## Проверка работы

- **Gate API**: http://localhost:3000
- **Swagger**: http://localhost:3000/api (если включен)
- **PostgreSQL**: localhost:5434
- **NATS**: localhost:4222
- **NATS Monitoring**: http://localhost:8222

## Остановка инфраструктуры

```bash
docker compose --env-file .env -f dev.docker-compose.yaml down
```

## Различия между локальной и Docker разработкой

### Локальная разработка (рекомендуется)

Приложения запускаются на хосте, инфраструктура (PostgreSQL, NATS) в Docker:

```env
PG_DB_HOST=localhost
PG_DB_PORT=5434
NATS_URL=nats://localhost:4222
```

**Преимущества:**

- Быстрый перезапуск приложений
- Удобная отладка
- Hot reload работает корректно

### Docker разработка

Все сервисы запускаются в Docker. В файле `dev.docker-compose.yaml` автоматически переопределяются переменные окружения:

```yaml
environment:
  PG_DB_HOST: postgres # имя сервиса в docker-compose
  NATS_URL: nats://nats:4222 # имя сервиса в docker-compose
```

Это означает, что даже если в `.env` файле указаны значения для локальной разработки (`localhost`), Docker Compose автоматически использует правильные значения (`postgres`, `nats`) внутри контейнеров.

**Используйте этот режим:**

- Для тестирования полного стека
- Для CI/CD
- Для проверки конфигурации Docker

## Важные замечания

1. **Порт PostgreSQL**: Внутри Docker PostgreSQL использует порт `5434`, поэтому:
   - Для локальной разработки: `PG_DB_PORT=5434` (порт маппинга на хосте)
   - Для Docker: `PG_DB_PORT=5434` (внутренний порт)

2. **Переменные окружения для notification service**:
   Обязательно настройте `MAIL_*` переменные для работы уведомлений.

3. **JWT секреты**: В продакшене используйте сильные случайные секреты!
