import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common'

/**
 * Pipe для удаления __traceId из payload перед валидацией
 * Это позволяет передавать trace-id между сервисами без нарушения ValidationPipe
 */
@Injectable()
export class RemoveTraceIdPipe implements PipeTransform {
  transform(value: any, _metadata: ArgumentMetadata) {
    if (value && typeof value === 'object' && !Array.isArray(value) && '__traceId' in value) {
      // Создаем новый объект без __traceId
      const { __traceId, ...rest } = value
      return rest
    }
    return value
  }
}



