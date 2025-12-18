FROM node:24-alpine as build
ARG SERVICE_NAME=gate
WORKDIR /app

ADD . /app

RUN npm install -g pnpm @nestjs/cli && \
    pnpm install --prefer-offline

RUN nest build $SERVICE_NAME

FROM node:24-alpine
WORKDIR /app
ARG SERVICE_NAME=gate
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist/apps/${SERVICE_NAME} .

ENTRYPOINT node main.js
