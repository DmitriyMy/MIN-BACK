#!/bin/bash
# Скрипт для обновления .env файла для локальной разработки

if [ ! -f .env ]; then
    echo "Создаю .env из example.env..."
    cp example.env .env
else
    echo "Обновляю .env для локальной разработки..."
fi

# Обновляем значения для локальной разработки
sed -i 's|PG_DB_HOST=.*|PG_DB_HOST=localhost|g' .env
sed -i 's|PG_DB_PORT=.*|PG_DB_PORT=5432|g' .env
sed -i 's|NATS_URL=.*|NATS_URL=nats://localhost:4222|g' .env
sed -i 's|GATE_APP_HOST=.*|GATE_APP_HOST=0.0.0.0|g' .env
sed -i 's|LOGGER_MIN_LEVEL=.*|LOGGER_MIN_LEVEL=debug|g' .env

echo "✅ .env файл обновлен для локальной разработки"
echo "Проверьте значения MAIL_* перед использованием notification service"
