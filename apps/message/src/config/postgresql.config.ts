import { registerAs } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { BaseDataSourceOptions } from 'typeorm/data-source/BaseDataSourceOptions'
import { PostgresConnectionCredentialsOptions } from 'typeorm/driver/postgres/PostgresConnectionCredentialsOptions'
import { Messages } from '@app/entitiesPG'

export type PostgresqlConfig = PostgresConnectionCredentialsOptions & BaseDataSourceOptions & TypeOrmModuleOptions

export const dataSourceName = 'postgresql'

export const getPostgresqlConfig = (): PostgresqlConfig => ({
  type: 'postgres',
  name: dataSourceName,
  host: process.env.PG_DB_HOST,
  port: Number(process.env.PG_DB_PORT),
  username: process.env.PG_DB_USER,
  password: process.env.PG_DB_PASSWORD,
  database: process.env.PG_DB_NAME,
  entities: [Messages],
  autoLoadEntities: true,
})

export const postgresqlConfig = registerAs(dataSourceName, () => getPostgresqlConfig())
