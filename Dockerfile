FROM node:24-alpine as build
ARG SERVICE_NAME=gate
WORKDIR /app

# Копирование конфигурационных файлов для офлайн режима
COPY package*.json pnpm-lock.yaml* .pnpmrc* ./

# Копирование node_modules для офлайн режима
# ВАЖНО: Для работы офлайн режима:
# 1. Установите зависимости локально: cd MIN-BACK && pnpm install
# 2. Временно закомментируйте "node_modules" в .dockerignore перед сборкой
#    (см. OFFLINE_BUILD.md для подробностей)
COPY node_modules ./node_modules/

# Копирование остальных файлов
COPY . .

RUN npm install -g pnpm @nestjs/cli && \
    pnpm install --prefer-offline --no-verify-store-integrity

RUN nest build $SERVICE_NAME

FROM node:24-alpine
WORKDIR /app
ARG SERVICE_NAME=gate
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist/apps/${SERVICE_NAME} .

ENTRYPOINT node main.js
