import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import * as bodyParser from 'body-parser'
import { Request, Response } from 'express'

@Injectable()
export class JsonBodyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JsonBodyMiddleware.name)

  use(req: Request, res: Response, next: () => unknown) {
    bodyParser.json()(req, res, next)
  }
}
