import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'
import { IChatParticipantDB } from '@app/types/ChatParticipant'

@Entity('chat_participants')
export class ChatParticipant extends BaseEntity implements IChatParticipantDB {
  @PrimaryColumn({
    type: 'uuid',
    nullable: false,
    name: 'chat_id',
  })
  public chatId: string

  @Column({
    type: 'uuid',
    nullable: false,
    name: 'user_id',
  })
  public userId: string

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  public createdAt: Date
}
