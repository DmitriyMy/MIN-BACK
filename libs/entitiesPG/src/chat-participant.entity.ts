import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('chat-participant')
export class ChatParticipant extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
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