import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

import { MessageStatus } from '@app/constants/message'
import { ChatId, IMessageDB, MessageId, SenderId } from '@app/types/Message'

@Entity('messages')
export class Messages extends BaseEntity implements IMessageDB {
  @PrimaryGeneratedColumn('uuid')
  id: MessageId

  @Column({ name: 'chat_id', type: 'uuid' })
  chatId: ChatId

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: SenderId

  @Column({
    type: 'varchar',
    nullable: false,
  })
  message: string

  @Column({
    type: 'smallint',
    default: MessageStatus.sent,
  })
  messageStatus: MessageStatus

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date
}
