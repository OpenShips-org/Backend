import Fastify, { type FastifyInstance } from 'fastify'
import fastifyMariaDB from 'fastify-mariadb'
import fastifySensible from '@fastify/sensible'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUI from '@fastify/swagger-ui'

import { loadLastPositionsFromDatabase, startHistoricalBatchFlush } from './handler/PositionReport.js'
import { Scraper } from './data/scraper/index.js'
import { AISStreamClient } from './data/aisstream.js'
import { validateTables } from './utils/db.js'

import { VesselPositionSchema } from './schemas/vessel.js'
import Routes from './routes/index.js'

import * as dotenv from 'dotenv'

//#region Config
declare global {
    var fastifyInstance: FastifyInstance | undefined
}

dotenv.config()
//#endregion

//#region Fastify Setup
const fastify = Fastify({
    logger: true,
})

fastify.register(fastifySensible)

fastify.register(fastifySwagger as any, {
    openapi: {
        info: {
            title: 'OpenShips API',
            description: 'API for OpenShips vessel tracking and data management',
            version: '1.0.0',
        },
        basePath: '/v1',
        host: `localhost:${process.env.PORT ?? 3000}`,
        servers: [
            {
                url: `http://localhost:${process.env.PORT ?? 3000}/v1`,
                description: 'Local development server',
                protocol: 'http',
                security: [],
                schemes: ['http'],
            },
            {
                url: `https://api.openships.de/v1`,
                description: 'Production server (Temporary .de domain)',
                protocol: 'https',
                security: [],
                schemes: ['https'],
            }
        ],
        tags: [
            {
                name: 'Vessels',
                description: 'Endpoints related to vessel information and positions',
            },
            {
                name: 'Base Stations',
                description: 'Endpoints related to AIS base station information and positions',
            },
            {
                name: 'Ports',
                description: 'Endpoints related to port information and vessel arrivals/departures',
            }
        ],
        components: {
            schemas: {
                VesselPosition: VesselPositionSchema,
            },
        }
    },
})

fastify.register(fastifySwaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'none',
        deepLinking: false,
    },
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
//#endregion

const AISClient = new AISStreamClient(fastify)
const scraper = new Scraper(fastify)

async function doStartupTasks() {
    console.log('Performing startup tasks...')

    await fastify.ready()

    await validateTables(fastify.mariadb)
    await AISClient.createSocket()

    await loadLastPositionsFromDatabase(fastify)
    startHistoricalBatchFlush(fastify)

    console.log('Startup tasks completed.')
}

start()
