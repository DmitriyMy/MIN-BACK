import { AUTH_QUEUE } from '@app/constants/auth'
import { bootstrapNatsMicroservice } from '@app/infrastructure'
import { AppModule } from './app.module'

void bootstrapNatsMicroservice(AppModule, AUTH_QUEUE)
