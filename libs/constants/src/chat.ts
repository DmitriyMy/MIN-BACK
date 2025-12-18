export const CHAT_QUEUE = 'chat'

export enum ChatType {
    PRIVATE = 1,
    GROUP = 2,
    CHANNEL = 3
}

export enum ChatStatus {
    SENT = 1,
    DELIVERED = 2,
    READ = 3
}