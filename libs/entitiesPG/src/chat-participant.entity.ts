import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('chat_participants')
export class ChatParticipant extends BaseEntity {
    @PrimaryColumn({
        type: 'uuid',
        name: 'chat_id',
    })
    public chatId: string

    @Column({
        type: 'uuid',
        name: 'user_id',
    })
    public userId: string
}