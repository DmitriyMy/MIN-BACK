import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { ChatType } from '@app/constants/chat'
import { MessageStatus } from '@app/constants/message'
import { IChatDB } from '@app/types/Chat'

@Entity('chats')
export class Chat extends BaseEntity implements IChatDB {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({
        type: 'uuid',
        nullable: false,
        name: 'chat_id',
    })
    chatId: string

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
    senderId: string

    @Column({
        type: 'enum',
        enum: ChatType,
        default: ChatType.PRIVATE,
    })
    type: ChatType

    @Column({
        type: 'text',
        nullable: false,
    })
    text: string

    @Column({
        type: 'varchar',
        default: 'sent',
    })
    status: string

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
    createdAt: Date
}