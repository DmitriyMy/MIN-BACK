import { ConfigService } from '@nestjs/config'
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter'

export const getMailConfig = async (configService: ConfigService) => {
  const transport = {
    host: configService.get<string>('MAIL_HOST'),
    port: configService.get<number>('MAIL_PORT'),
    secure: configService.get<boolean>('MAIL_SECURE'),
    auth: {
      user: configService.get<string>('MAIL_USER'),
      pass: configService.get<string>('MAIL_PASS'),
    },
  }
  console.log(`trans`, transport)
  return {
    transport,
    defaults: {
      from: `"${configService.get<string>('MAIL_FROM_NAME')}" <${configService.get<string>('MAIL_FROM_ADDRESS')}>`,
    },
    template: {
      dir: __dirname + '/views/email-templates',
      adapter: new HandlebarsAdapter(),
      option: {
        strict: true,
      },
    },
  }
}
