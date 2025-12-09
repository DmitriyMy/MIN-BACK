
import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

export enum ChatType {
    PRIVATE = 'private',
    GROUP = 'group'
}

@Entity('chats')
export class Chat extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({
        type: 'enum',
        enum: ChatType,
        default: ChatType.PRIVATE,
        name: 'type',
    })
    public type: ChatType

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
    createdAt: Date
}