/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, BeforeInsert } from 'typeorm'
import { IChatFlow } from '../../Interface'
import { sessionNamespace } from '../../utils/neraton'

@Entity()
export class ChatFlow implements IChatFlow {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column({ type: 'text' })
    flowData: string

    @Column({ nullable: true })
    deployed?: boolean

    @Column({ nullable: true })
    isPublic?: boolean

    @Column({ nullable: true })
    apikeyid?: string

    @Column({ nullable: true, type: 'text' })
    chatbotConfig?: string

    @Column({ nullable: true, type: 'text' })
    apiConfig?: string

    @Column({ nullable: true, type: 'text' })
    analytic?: string

    @Column({ nullable: true, type: 'text' })
    speechToText?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Column({ nullable: true, type: 'text' })
    category?: string

    // NERATON: Supabase RLS
    @Column({ type: 'uuid' })
    neraton_user_id: string

    @BeforeInsert()
    setUserId() {
        this.neraton_user_id = sessionNamespace.get('session').user.id
    }
}
