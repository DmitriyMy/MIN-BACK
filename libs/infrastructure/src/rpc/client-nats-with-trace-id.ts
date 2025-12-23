import { ClientNats, ReadPacket, WritePacket } from '@nestjs/microservices'
import { Observable } from 'rxjs'

/**
 * Расширенный NATS клиент для передачи trace-id в headers
 *
 * Переопределяет метод send() для добавления trace-id в заголовки NATS сообщения.
 */
export class ClientNatsWithTraceId extends ClientNats {
  private traceIdGetter?: () => string | undefined

  setTraceIdGetter(getter: () => string | undefined): void {
    this.traceIdGetter = getter
  }

  /**
   * Переопределяем send для добавления trace-id
   * Добавляем __traceId в payload, который будет извлечен на сервере до валидации
   */
  send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
    const traceId = this.traceIdGetter?.()

    // Если есть trace-id, добавляем его в payload
    // Поле __traceId будет извлечено и удалено в trace-id-rmq.module.ts до валидации
    if (traceId && typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const dataWithTraceId = {
        ...data,
        __traceId: traceId,
      } as TInput & { __traceId: string }

      return super.send(pattern, dataWithTraceId)
    }

    return super.send(pattern, data)
  }

  protected publish(message: ReadPacket, callback: (packet: WritePacket) => unknown): () => void {
    return super.publish(message, callback)
  }
}
