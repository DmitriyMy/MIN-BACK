import { UserId } from './User'

export type CallId = string

/**
 * Call Status
 */
export enum CallStatus {
  initiating = 'initiating',
  ringing = 'ringing',
  connecting = 'connecting',
  active = 'active',
  ended = 'ended',
  rejected = 'rejected',
  cancelled = 'cancelled',
}

/**
 * VPN/Xray Configuration
 */
export interface IXrayConfig {
  version: string
  log: {
    loglevel: string
  }
  inbounds: Array<{
    port: number
    protocol: string
    settings: Record<string, unknown>
    streamSettings?: Record<string, unknown>
  }>
  outbounds: Array<{
    protocol: string
    settings: Record<string, unknown>
    streamSettings?: Record<string, unknown>
  }>
}

export interface IVpnConnectionConfig {
  callId: CallId
  vpnServer: string
  vpnPort: number
  encryptionKey: string
  xrayConfig: IXrayConfig
  peerEndpoint?: string // Для прямого P2P соединения
}

export interface IInitiateCallRequest {
  calleeId: UserId
  callerId: UserId
}

export interface IInitiateCallResponse {
  callId: CallId
  callerId: UserId
  calleeId: UserId
}

export interface ICallStatusUpdate {
  callId: CallId
  status: CallStatus
  userId: UserId
}

