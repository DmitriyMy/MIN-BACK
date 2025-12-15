import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { ChatType } from '@app/constants/chat'
import { MessageStatus } from '@app/constants/message'
import { ChatId, IChatDB, SenderId } from '@app/types/Chat'

@Entity('chats')
export class Chat extends BaseEntity implements IChatDB {
  @PrimaryGeneratedColumn('uuid')
  chatId: ChatId

  @Column({
    type: 'uuid',
    nullable: false,
  })
  creator: string

  @Column({
    type: 'uuid',
    nullable: false,
    name: 'sender_id',
  })
  senderId: SenderId

  @Column({
    type: 'smallint',
    default: ChatType.PRIVATE,
  })
  type: ChatType

  @Column({
    type: 'varchar',
    default: '',
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
