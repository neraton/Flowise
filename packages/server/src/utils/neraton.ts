// NERATON: Supabase integration support for SSO.

import { DataSource, QueryResult, QueryRunner, ReplicationMode } from 'typeorm'
import { Request, Response, NextFunction } from 'express'
import { createServerClient, CookieOptions } from '@supabase/ssr'
import clsHooked from 'cls-hooked'

const supabasePublicKey = process.env.PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || ''

export const sessionNamespace = clsHooked.getNamespace('session') || clsHooked.createNamespace('session')

export async function initRLSTables(dataSource: DataSource) {
    const tableNames = [
        'assistant',
        'chat_flow',
        'chat_message',
        'chat_message_feedback',
        'credential',
        'tool',
        'upsert_history',
        'variable'
    ]
    const queryRunner = dataSource.createQueryRunner()

    for (let i = 0, count = tableNames.length; i < count; i++) {
        const tableName = tableNames[i]

        // Check if we need to augment at all.
        const columnNames = await queryRunner.query(
            `SELECT * FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}';`
        )
        const userIdColumn = columnNames.find((c: any) => c.column_name == 'neraton_user_id')
        if (!userIdColumn) {
            await queryRunner.query(`
                ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "neraton_user_id" UUID references auth.users not null;
                ALTER TABLE "${tableName}" enable row level security;
                CREATE POLICY "Can view own data." on "${tableName}" for select using (auth.uid() = neraton_user_id);
                CREATE POLICY "Can update own data." on "${tableName}" for update using (auth.uid() = neraton_user_id);
                CREATE POLICY "Can delete own data." on "${tableName}" for delete using (auth.uid() = neraton_user_id);
                CREATE POLICY "Can create own data." on "${tableName}" for insert with check (auth.uid() = neraton_user_id);
            `)
        }
    }

    // Only enable RLS on migrations table.
    await queryRunner.query(`ALTER TABLE "migrations" enable row level security;`)
}

export function injectQueryRunnerAugmentation(dataSource: DataSource): void {
    // Get reference to original createQueryRunner function and override.
    const originalCreateQueryRunnerFunc = dataSource.createQueryRunner
    dataSource.createQueryRunner = (mode?: ReplicationMode): QueryRunner => {
        // Call super.
        const queryRunner = originalCreateQueryRunnerFunc.call(dataSource, mode)

        // Get reference to original query function and override.
        const originalQueryFunc = queryRunner.query
        queryRunner.query = (...args: any[]): Promise<QueryResult> => {
            // Use args to avoid TS issues.
            let [query, parameters, useStructuredResult] = args

            // Try to get the user ID.
            const userId = sessionNamespace?.get('session')?.user?.id

            if (!userId || query.indexOf('request.jwt.claims') != -1) {
                // If userId is null, return the original result promise directly.
                // @ts-ignore
                return originalQueryFunc.call(queryRunner, query, parameters, useStructuredResult)
            }

            const setSession = queryRunner.manager.query(
                `SET SESSION request.jwt.claims to '{"sub":"${userId}" }'; set role authenticated;`
            )

            return new Promise<QueryResult>((resolve) => {
                setSession.then(() => {
                    // Once setSession resolves, execute the original query.
                    // @ts-ignore
                    const originalResult = originalQueryFunc.call(queryRunner, query, parameters, useStructuredResult)
                    originalResult.then((result: QueryResult) => {
                        resolve(result)
                    })
                })
            })
        }

        // Return modified runner.
        return queryRunner
    }
}

export function neratonMiddleware(req: Request, res: Response, next: NextFunction): void {
    sessionNamespace.bindEmitter(req)
    sessionNamespace.bindEmitter(res)

    const cookieDomain = 'neraton.com'
    const redirectUrl =
        'https://www.neraton.com/signin/oauth?app=true&status=Sign%20in%20required&status_description=Sign%20in%20first%20to%20access%20the%20app%2E'
    const pricingUrl =
        'https://www.neraton.com/pricing?status=No%20subscription&status_description=Start%20a%20subscription%20to%20resume%20your%20project%2E'

    // Create the server client.
    const supabase = createServerClient(supabaseUrl, supabasePublicKey, {
        cookies: {
            get(name: string) {
                return req.cookies[name]
            },
            set(name: string, value: string, options: CookieOptions) {
                res.cookie(name, value, options)
            },
            remove(name: string, options: CookieOptions) {
                res.clearCookie(name, options)
            }
        },
        cookieOptions: {
            domain: cookieDomain
        }
    })

    // Get the session and store it for this request.
    supabase.auth
        .getSession()
        .then((sessionData) => {
            if (sessionData?.error) {
                console.log(`[Neraton] Session error: ${sessionData?.error}`)
            } else {
                if (sessionData?.data?.session) {
                    sessionNamespace.run(() => {
                        sessionNamespace.set('session', sessionData?.data?.session)

                        // Ensure subscription is valid.
                        supabase
                            .from('subscriptions')
                            .select('*, prices(*, products(*))')
                            .in('status', ['trialing', 'active'])
                            .maybeSingle()
                            .then(({ data: subscription, error }) => {
                                if (subscription && !error) {
                                    next()
                                } else {
                                    console.log('[Neraton] No subscription!')
                                    res.redirect(pricingUrl)
                                }
                            })
                    })
                } else {
                    console.log(`[Neraton] Session not found!`)
                    res.redirect(redirectUrl)
                }
            }
        })
        .catch((ex) => {
            console.log(`[Neraton] Session exception: ${ex}`)
            res.redirect(redirectUrl)
        })
}
