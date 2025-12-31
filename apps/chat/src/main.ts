import { CHAT_QUEUE } from '@app/constants/chat'
import { bootstrapNatsMicroservice } from '@app/infrastructure'
import { AppModule } from './app.module'

void bootstrapNatsMicroservice(AppModule, CHAT_QUEUE)



