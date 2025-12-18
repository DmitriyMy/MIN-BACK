# Multi Point

## Запуск микросервисов

```bash
# dev mode start gate microservice
nest start gate

# watch mode start gate microservice
nest start gate --watch

```
## Запуск сборки локально
docker compose --env-file .env -f dev.docker-compose.yaml up --build