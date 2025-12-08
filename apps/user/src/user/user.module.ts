import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '@app/entitiesPG'

import { UserController } from './controllers/user.controller'
import { UserService } from './services/user.service'
import { dataSourceName } from '../config/postgresql.config'

@Module({
  imports: [TypeOrmModule.forFeature([User], dataSourceName)],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
