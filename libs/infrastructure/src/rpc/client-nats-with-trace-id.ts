import { ClientNats, ReadPacket, WritePacket } from '@nestjs/microservices'

export class ClientNatsWithTraceId extends ClientNats {
  protected publish(message: ReadPacket, callback: (packet: WritePacket) => unknown): () => void {
    return super.publish(message, callback)
  }
}
