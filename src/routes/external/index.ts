import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import vesselRoutes from './vessels/index.js'
import baseStationRoutes from './base-stations/index.js'
import openGraphRoutes from './open-graphs/index.js'
import portRoutes from './ports/index.js'

export default function externalRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    
    fastify.register(vesselRoutes, { prefix: '/vessels' })
    fastify.register(baseStationRoutes, { prefix: '/base-stations' })
    fastify.register(openGraphRoutes, { prefix: '/og' })
    fastify.register(portRoutes, { prefix: '/ports' })

    fastify.get('/', {schema: {hide: true}}, async (request, reply) => {
        throw fastify.httpErrors.notFound('Endpoint not found.')
    })
}
