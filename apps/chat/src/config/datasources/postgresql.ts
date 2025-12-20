import { DataSource } from 'typeorm'
import { Chat, ChatParticipant } from '@app/entitiesPG'
import { getPostgresqlConfig } from '../postgresql.config'

const config = getPostgresqlConfig()

export default new DataSource({
  ...config,
  entities: [Chat, ChatParticipant],
})

