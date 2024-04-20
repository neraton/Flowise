/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, BeforeInsert } from 'typeorm'
import { IAssistant } from '../../Interface'
import { sessionNamespace } from '../../utils/neraton'

@Entity()
export class Assistant implements IAssistant {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    details: string

    @Column({ type: 'uuid' })
    credential: string

    @Column({ nullable: true })
    iconSrc?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    // NERATON: Supabase RLS
    @Column({ type: 'uuid' })
    neraton_user_id: string

    @BeforeInsert()
    setUserId() {
        this.neraton_user_id = sessionNamespace.get('session').user.id
    }
}
