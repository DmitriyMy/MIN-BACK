import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

import { messageStatus } from "@app/constants/message";
import { IMessageDB, id, chatId, senderId } from '@app/types/Message'

@Entity('messages')
export class Messages extends BaseEntity implements IMessageDB{
    @PrimaryGeneratedColumn('uuid')
    id: id
    chatId: chatId
    senderId: senderId

    @Column({
        type: 'varchar',
        nullable: false,
        name: 'text',
    })
    public text: string

    @Column({
        type: 'varchar',
        nullable: false,
        default: messageStatus.sent,
    })
    public role: messageStatus

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
    createdAt: Date
}