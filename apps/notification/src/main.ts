import { NOTIFICATION_QUEUE } from '@app/constants/notification'
import { bootstrapNatsMicroservice } from '@app/infrastructure'
import { AppModule } from './app.module'

void bootstrapNatsMicroservice(AppModule, NOTIFICATION_QUEUE)
