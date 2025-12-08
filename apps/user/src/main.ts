import { USER_QUEUE } from '@app/constants/user'
import { bootstrapNatsMicroservice } from '@app/infrastructure'
import { AppModule } from './app.module'

void bootstrapNatsMicroservice(AppModule, USER_QUEUE)
