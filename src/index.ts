import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import fastifyMariaDB from 'fastify-mariadb'
import fastifySensible from '@fastify/sensible'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUI from '@fastify/swagger-ui'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'

import path from 'path'
import { fileURLToPath } from 'url'

import { loadLastPositionsFromDatabase, startHistoricalBatchFlush } from './handler/PositionReport.js'
import { startBaseStationBatchFlush } from './handler/BaseStationReport.js'
import { startStaticShipBatchFlush } from './handler/ShipStaticData.js'
import { Scraper } from './data/scraper/index.js'
import { AISStreamClient } from './data/aisstream.js'

import { validateTables } from './db/index.js'
import importPorts from './db/portImporter.js'

import { VesselPositionSchema } from './schemas/vessel.js'
import { BaseStationPositionScheme } from './schemas/baseStation.js'

import Routes from './routes/index.js'

import * as dotenv from 'dotenv'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

//#region Config
declare global {
    var fastifyInstance: FastifyInstance | undefined
}

dotenv.config()

const parsedPort = Number(process.env.PORT)
const PORT = Number.isInteger(parsedPort) && parsedPort >= 0 && parsedPort < 65536
    ? parsedPort
    : 4000
//#endregion

//#region Fastify Setup
const fastify = Fastify({
    logger: true,
})

fastify.register(fastifySensible, {
    sharedSchemaId: 'HttpError'
})

fastify.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
})

fastify.register(fastifySwagger as any, {
    openapi: {
        info: {
            title: 'OpenShips API',
            description: 'API for OpenShips vessel tracking and data management',
            version: '1.0.0',
        },
        basePath: '/v1',
        host: `localhost:${PORT}`,
        servers: [
            {
                url: `http://localhost:${PORT}/v1`,
                description: 'Local development server',
                protocol: 'http',
                security: [],
                schemes: ['http'],
            },
            {
                url: `https://api.openships.de/v1`,
                description: 'Production server',
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
                BaseStationPosition: BaseStationPositionScheme,
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

//#region Rate Limiting
fastify.register(fastifyRateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
})
//#endregion

const AISClient = new AISStreamClient(fastify)
const scraper = new Scraper(fastify)

fastify.decorate('scraper', scraper)

fastify.register(Routes, { prefix: '/v1' })

const start = async () => {
    try {
        await doStartupTasks()
        await fastify.listen({ port: PORT, host: '0.0.0.0' })
        console.log(`Server is running on http://localhost:${PORT}`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
//#endregion

async function doStartupTasks() {
    console.log('Performing startup tasks...')

    await fastify.ready()

    await validateTables(fastify)
    await AISClient.createSocket()

    await loadLastPositionsFromDatabase(fastify)
    
    // Start periodic flushers for queued handlers
    startHistoricalBatchFlush(fastify)
    startBaseStationBatchFlush(fastify)
    startStaticShipBatchFlush(fastify)

    const portsFilePath = path.join(__dirname, '../public/WPI_Ports.csv')
    try {
        const rows = await fastify.mariadb.query('SELECT COUNT(*) as cnt FROM ports')
        const portCount = Array.isArray(rows) ? rows[0]?.cnt ?? 0 : 0

        if (portCount === 0 && process.env.SKIP_PORT_IMPORT !== 'true') {
            await importPorts(fastify, portsFilePath)
            console.log(chalk.green('Port data import completed.'))
        } else {
            console.log(chalk.yellow('Skipping port import — table already populated or SKIP_PORT_IMPORT=true'))
        }
    } catch (err) {
        console.error(chalk.red('Error checking/importing port data:'), err)
    }

    scraper.startUpdateOldVesselsInterval()

    console.log('Startup tasks completed.')
}

start()
