import { Module } from '@nestjs/common'

import { ConfigModule } from '@nestjs/config'
import { VerificationService } from './verification.service'

@Module({
  imports: [ConfigModule],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
