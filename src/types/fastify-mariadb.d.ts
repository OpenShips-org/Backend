declare module 'fastify-mariadb' {
    import { FastifyPluginCallback } from 'fastify'
    import { Pool, PoolOptions, Connection } from 'mariadb'

    export interface FastifyMariaDBOptions extends PoolOptions {
        host?: string
        user?: string
        password?: string
        database?: string
        connectionLimit?: number
        promise?: boolean
        timezone?: string
        connectionString?: string
    }

    const fastifyMariaDB: FastifyPluginCallback<FastifyMariaDBOptions>
    export default fastifyMariaDB
}
