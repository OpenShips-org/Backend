import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import vesselRoutes from './vessels/index.js'
import baseStationRoutes from './base-stations/index.js'

export default function externalRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    
    fastify.register(vesselRoutes, { prefix: '/vessels' })
    fastify.register(baseStationRoutes, { prefix: '/base-stations' })

    fastify.get('/', {schema: {hide: true}}, async (request, reply) => {
        throw fastify.httpErrors.notFound('Endpoint not found.')
    })
}
