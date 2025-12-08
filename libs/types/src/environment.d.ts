import { EnvironmentType, LoggerLevel } from "@app/constants/common"

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // App
      NODE_ENV: EnvironmentType
      LOGGER_MIN_LEVEL: LoggerLevel
      
      // NATS
      NATS_URL: string
      
      // JSON Web Token
      JWT_AUTH_SECRET: string
      JWT_AUTH_EXPIRE: string
      JWT_EMAIL_EXPIRE: string
      JWT_EMAIL_SECRET: string
      
      
      // Gate
      GATE_APP_HOST: string
      GATE_APP_PORT: number
      
      
      // Notification
      // EMAIL_HOST: string
      // EMAIL_PORT: number
      // EMAIL_USER: string
      // EMAIL_PASSWORD: string
      // EMAIL_SENDER_NAME: string
      // EMAIL_SENDER_EMAIL: string
      
      SMS_RU_API_ID: string
    

    }
  }
}
