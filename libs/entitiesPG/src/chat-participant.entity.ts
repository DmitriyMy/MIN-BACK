import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { IChatParticipantDB,ChatID,UserID } from '@app/types/ChatParticipant'
@Entity('chat-participant')
export class ChatParticipant extends BaseEntity implements IChatParticipantDB {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'uuid',
    nullable: false,
    name: 'chat_id',
  })
  public chatId: ChatID

  @Column({
    type: 'uuid',
    nullable: false,
    name: 'user_id',
  })
  public userId: UserID

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  public createdAt: Date
}