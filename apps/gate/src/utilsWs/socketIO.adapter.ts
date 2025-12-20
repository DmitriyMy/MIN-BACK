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
    let origin: string | string[] | boolean = '*'

    if (this.corsOrigin) {
      origin = Array.isArray(this.corsOrigin) ? this.corsOrigin : [this.corsOrigin]
    } else if (process.env.CORS_ORIGIN) {
      origin = process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Version'],
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      cookie: false,
    })
  }
}
