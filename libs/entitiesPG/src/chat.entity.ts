import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { IChatDB, id, chatId, senderId } from '@app/types/Chat'
import { chatStatus } from '@app/constants/chat'

export enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group',
}

@Entity('chats')
export class Chat extends BaseEntity implements IChatDB {
  @PrimaryGeneratedColumn('uuid')
  id: id

  @Column({
    type: 'uuid',
    nullable: false,
    name: 'chat_id',
  })
  chatId: chatId

  @Column({
    type: 'uuid',
    nullable: false,
    name: 'sender_id',
  })
  senderId: senderId

  @Column({
    type: 'enum',
    enum: ChatType,
    default: ChatType.PRIVATE,
    name: 'type',
  })
  public type: ChatType

  @Column({
    type: 'text',
    nullable: false,
  })
  text: string

  @Column({
    type: 'enum',
    enum: chatStatus,
    default: chatStatus.sent,
  })
  status: chatStatus

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date
}
