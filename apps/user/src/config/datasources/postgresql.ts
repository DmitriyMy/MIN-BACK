import { config as dotenvConfig } from 'dotenv'
import { DataSource, DataSourceOptions } from 'typeorm'

import { getPostgresqlConfig } from '../postgresql.config'

dotenvConfig({ path: `.env` })

export const connectionSource = new DataSource(getPostgresqlConfig() as DataSourceOptions)
