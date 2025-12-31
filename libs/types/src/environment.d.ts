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
      
      // Call Rate Limiting
      CALL_RATE_LIMIT_PER_MINUTE?: string
      CALL_RATE_LIMIT_TO_USER_PER_MINUTE?: string
      CALL_MAX_ACTIVE_CALLS?: string
      CALL_REJECTED_COOLDOWN_SECONDS?: string
      // Call Timeouts
      CALL_TIMEOUT_INITIATING_SECONDS?: string
      CALL_TIMEOUT_RINGING_SECONDS?: string
      CALL_TIMEOUT_CONNECTING_SECONDS?: string
      CALL_TIMEOUT_ACTIVE_MINUTES?: string
      // WebRTC Signal Security
      CALL_WEBRTC_SIGNAL_MAX_AGE_SECONDS?: string
      
      // VPN Configuration
      VPN_SERVER?: string
      VPN_PORT?: string
      
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
