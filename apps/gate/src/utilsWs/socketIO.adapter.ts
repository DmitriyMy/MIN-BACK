import { INestApplicationContext } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { Server, ServerOptions } from 'socket.io'

export class SocketIoAdapter extends IoAdapter {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    appOrHttpServer?: INestApplicationContext | never,
    private readonly corsOrigin?: string | string[],
  ) {
    super(appOrHttpServer)
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const origin = this.corsOrigin ?? process.env.CORS_ORIGIN?.split(',') ?? '*'

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      cookie: false,
    })
  }
}
