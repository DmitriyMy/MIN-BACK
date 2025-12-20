import { Exclude } from 'class-transformer'
import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { UserRole, UserStatus } from '@app/constants/user'
import { IUserDB, UserId } from '@app/types/User'

@Entity('users')
export class User extends BaseEntity implements IUserDB {
  @PrimaryGeneratedColumn('uuid')
  userId: UserId

  @Column({
    type: 'varchar',
    nullable: false,
    name: 'name',
  })
  public name: string

  @Column({
    type: 'varchar',
    nullable: false,
    name: 'surname',
  })
  public surname: string

  @Column({
    type: 'varchar',
    nullable: false,
  })
  public description: string

  @Column({
    type: 'varchar',
    nullable: true,
  })
  public email: string

  @Column({
    type: 'varchar',
    nullable: true,
  })
  public newEmail: string

  @Column({
    type: 'boolean',
    default: false,
    name: 'is_verified_email',
  })
  public isVerifiedEmail: boolean

  @Column({
    type: 'varchar',
    nullable: true,
  })
  public phone: string

  @Exclude()
  @Column({
    type: 'varchar',
    nullable: true,
  })
  public password: string

  @Exclude()
  @Column({
    type: 'varchar',
    nullable: true,
  })
  public newPassword: string

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  public consent: string

  @Column({
    type: 'varchar',
    nullable: false,
    default: UserRole.person,
  })
  public role: UserRole

  @Column({
    type: 'varchar',
    nullable: true,
    default: '',
  })
  avatar: string

  @Column({
    type: 'varchar',
    nullable: true,
    default: UserStatus.available,
  })
  status: UserStatus

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date
}
