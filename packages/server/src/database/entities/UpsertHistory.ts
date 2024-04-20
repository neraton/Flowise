/* eslint-disable */
import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, BeforeInsert } from 'typeorm'
import { IUpsertHistory } from '../../Interface'
import { sessionNamespace } from '../../utils/neraton'

@Entity()
export class UpsertHistory implements IUpsertHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column()
    chatflowid: string

    @Column()
    result: string

    @Column()
    flowData: string

    @CreateDateColumn()
    date: Date

    // NERATON: Supabase RLS
    @Column({ type: 'uuid' })
    neraton_user_id: string

    @BeforeInsert()
    setUserId() {
        this.neraton_user_id = sessionNamespace.get('session').user.id
    }
}
