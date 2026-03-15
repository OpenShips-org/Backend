import 'fastify'
import { Pool, Connection } from 'mariadb'

declare module 'fastify' {
    interface FastifyInstance {
        mariadb: {
            pool: Pool
            query: (sql: string, values?: any[]) => Promise<any>
            getConnection: () => Promise<Connection>
        }
    }
}
