export enum CallEvent {
  // Client to Server events
  INITIATE_CALL = 'initiate-call',
  ACCEPT_CALL = 'accept-call',
  REJECT_CALL = 'reject-call',
  VPN_READY = 'vpn-ready', // Клиент готов к установке VPN
  HANGUP = 'hangup',
  // Server to Client events
  CALL_INITIATED = 'call-initiated',
  INCOMING_CALL = 'incoming-call',
  CALL_ACCEPTED = 'call-accepted',
  VPN_CONFIG_RECEIVED = 'vpn-config-received', // Получена VPN конфигурация
  VPN_CONNECTED = 'vpn-connected', // VPN канал установлен
  CALL_REJECTED = 'call-rejected',
  CALL_HANGUP = 'call-hangup',
  CALL_ERROR = 'call-error',
}

