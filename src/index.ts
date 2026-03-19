import Fastify, { type FastifyInstance } from 'fastify'
import * as dotenv from 'dotenv'
import { AISStreamClient } from './data/aisstream.js'
import { validateTables } from './utils/db.js'
import fastifyMariaDB from 'fastify-mariadb'
import * as Scraper from './data/scraper/index.js' 

declare global {
    var fastifyInstance: FastifyInstance | undefined
}

dotenv.config()

import Routes from './routes/index.js'

const fastify = Fastify({
    logger: true,
})

fastify.register(fastifyMariaDB, {
    host: process.env.DB_HOST!,
    user: process.env.DB_USER!,
    password: process.env.DB_PSWD!,
    database: 'openships',
    connectionLimit: 20,
    promise: true,
    timezone: 'Z',
})

fastify.register(Routes, { prefix: '/v1' })

const start = async () => {
    try {
        await doStartupTasks()
        const port = Number(process.env.PORT ?? 3000)
        await fastify.listen({ port })
        console.log(`Server is running on http://localhost:${port}`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

const AISClient = new AISStreamClient(fastify)

async function doStartupTasks() {
    console.log('Performing startup tasks...')

    await validateTables(fastify.mariadb)
    await AISClient.createSocket()
    void Scraper.startScraping()

    console.log('Startup tasks completed.')
}

start()
