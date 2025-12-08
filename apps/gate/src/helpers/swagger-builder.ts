import { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

export const setupSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder().setTitle('Gate Backend Api').setVersion('1.0').addBearerAuth().build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)
}
