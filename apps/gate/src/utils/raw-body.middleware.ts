import { Injectable, NestMiddleware } from '@nestjs/common'
import * as bodyParser from 'body-parser'
import { Request, Response } from 'express'

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  // Reason: need to implement expected specified interface
  // eslint-disable-next-line class-methods-use-this
  use(req: Request, res: Response, next: () => unknown) {
    bodyParser.raw({ type: '*/*' })(req, res, next)
  }
}
