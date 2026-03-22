import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import vesselRoutes from './vessels/index.js'

export default function externalRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    
    fastify.register(vesselRoutes, { prefix: '/vessels' })

    fastify.get('/', async (request, reply) => {
        return { vessel: '404' }
    })
}
