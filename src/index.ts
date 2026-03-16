import Fastify, { type FastifyInstance } from 'fastify'
import * as dotenv from 'dotenv'
import { AISStreamClient } from './aisstream.js'
import { validateTables } from './db.js'
import fastifyMariaDB from 'fastify-mariadb'

declare global {
    var fastifyInstance: FastifyInstance | undefined
}

dotenv.config()

import vesselRoutes from './routes/vessel/index.js'

const fastify = Fastify({
    logger: true,
})

globalThis.fastifyInstance = fastify

fastify.register(fastifyMariaDB, {
    host: process.env.DB_HOST!,
    user: process.env.DB_USER!,
    password: process.env.DB_PSWD!,
    database: 'openships',
    connectionLimit: 5,
    promise: true,
})

fastify.register(vesselRoutes, { prefix: '/vessel' })

const start = async () => {
    try {
        await fastify.listen({ port: 3000 })
        await doStartupTasks()
        console.log('Server is running on http://localhost:3000')
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

const AISClient = new AISStreamClient(fastify)

async function doStartupTasks() {
    console.log('Performing startup tasks...')

    AISClient.createSocket()
    await validateTables(fastify.mariadb)

    console.log('Startup tasks completed.')
}

start()
