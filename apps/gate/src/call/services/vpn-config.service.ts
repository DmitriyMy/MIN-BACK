import { Injectable, Logger } from '@nestjs/common'
import { createHash } from 'crypto'
import { CallId, IVpnConnectionConfig, IXrayConfig } from '@app/types/Call'

@Injectable()
export class VpnConfigService {
  private logger = new Logger(VpnConfigService.name)

  // VPN сервер конфигурация (должна быть в env переменных)
  private readonly vpnServer: string = process.env.VPN_SERVER || 'vpn.example.com'
  private readonly vpnPort: number = parseInt(process.env.VPN_PORT || '443', 10)

  /**
   * Генерирует уникальную VPN конфигурацию xray для звонка
   */
  generateVpnConfig(callId: CallId, userId: string, isInitiator: boolean): IVpnConnectionConfig {
    // Генерируем уникальный ключ шифрования для звонка
    const encryptionKey = this.generateEncryptionKey(callId, userId)

    // Генерируем UUID для пользователя в VPN сети
    const vpnUserId = this.generateVpnUserId(userId, callId)

    // Создаем xray конфигурацию
    const xrayConfig: IXrayConfig = {
      version: '1.0.0',
      log: {
        loglevel: 'warning',
      },
      inbounds: [
        {
          port: 10808, // Локальный порт для VPN клиента
          protocol: 'socks',
          settings: {
            auth: 'noauth',
            udp: true,
          },
        },
      ],
      outbounds: [
        {
          protocol: 'vless',
          settings: {
            vnext: [
              {
                address: this.vpnServer,
                port: this.vpnPort,
                users: [
                  {
                    id: vpnUserId,
                    encryption: 'none',
                    flow: '',
                  },
                ],
              },
            ],
          },
          streamSettings: {
            network: 'ws',
            security: 'tls',
            wsSettings: {
              path: `/call/${callId}`,
              headers: {
                Host: this.vpnServer,
              },
            },
            tlsSettings: {
              serverName: this.vpnServer,
              allowInsecure: false,
            },
          },
        },
      ],
    }

    return {
      callId,
      vpnServer: this.vpnServer,
      vpnPort: this.vpnPort,
      encryptionKey,
      xrayConfig,
    }
  }

  /**
   * Генерирует ключ шифрования на основе callId и userId
   */
  private generateEncryptionKey(callId: CallId, userId: string): string {
    const hash = createHash('sha256')
    hash.update(`${callId}:${userId}:${Date.now()}`)
    return hash.digest('hex')
  }

  /**
   * Генерирует уникальный VPN user ID для пользователя в контексте звонка
   */
  private generateVpnUserId(userId: string, callId: CallId): string {
    const hash = createHash('sha256')
    hash.update(`${userId}:${callId}`)
    return hash.digest('hex').substring(0, 32)
  }

  /**
   * Валидирует VPN конфигурацию
   */
  validateVpnConfig(config: IVpnConnectionConfig): boolean {
    if (!config.callId || !config.vpnServer || !config.encryptionKey) {
      return false
    }

    if (!config.xrayConfig || !config.xrayConfig.outbounds || config.xrayConfig.outbounds.length === 0) {
      return false
    }

    return true
  }
}

