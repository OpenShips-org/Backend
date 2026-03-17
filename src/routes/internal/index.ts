import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import vesselRoutes from './vessel/index.js'

export default function internalRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.register(vesselRoutes, { prefix: '/vessel' })

    fastify.get('/', async (request, reply) => {
        return { vessel: '404' }
    })
}
