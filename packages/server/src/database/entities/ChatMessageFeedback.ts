/* eslint-disable */
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index, Unique, BeforeInsert } from 'typeorm'
import { IChatMessageFeedback, ChatMessageRatingType } from '../../Interface'
import { sessionNamespace } from '../../utils/neraton'

@Entity()
@Unique(['messageId'])
export class ChatMessageFeedback implements IChatMessageFeedback {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    chatflowid: string

    @Index()
    @Column({ type: 'varchar' })
    chatId: string

    @Column({ type: 'uuid' })
    messageId: string

    @Column({ nullable: true })
    rating: ChatMessageRatingType

    @Column({ nullable: true, type: 'text' })
    content?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    // NERATON: Supabase RLS
    @Column({ type: 'uuid' })
    neraton_user_id: string

    @BeforeInsert()
    setUserId() {
        this.neraton_user_id = sessionNamespace.get('session').user.id
    }
}
