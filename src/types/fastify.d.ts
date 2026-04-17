import 'fastify'
import { Pool, Connection } from 'mariadb'
import type { Scraper } from '../data/scraper/index.js'

declare module 'fastify' {
    interface FastifyInstance {
        mariadb: {
            pool: Pool
            query: (sql: string, values?: any[]) => Promise<any>
            getConnection: () => Promise<Connection>
        }
        scraper: Scraper
    }
}
