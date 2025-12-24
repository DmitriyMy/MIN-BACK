import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'
import { ChatId } from '@app/types/Chat'
import { IChatParticipantDB } from '@app/types/ChatParticipant'
import { UserId } from '@app/types/User'

@Entity('chat_participants')
export class ChatParticipant extends BaseEntity implements IChatParticipantDB {
  @PrimaryColumn({
    type: 'uuid',
    nullable: false,
    name: 'chat_id',
  })
  public chatId: ChatId

  @PrimaryColumn({
    type: 'uuid',
    nullable: false,
    name: 'user_id',
  })
  public userId: UserId

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  public createdAt: Date
}
