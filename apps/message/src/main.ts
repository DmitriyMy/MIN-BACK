import { MESSAGE_QUEUE } from '@app/constants/message'
import { bootstrapNatsMicroservice } from '@app/infrastructure'
import { AppModule } from './app.module'

void bootstrapNatsMicroservice(AppModule, MESSAGE_QUEUE)
