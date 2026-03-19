import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import positionRoutes from './position.js'
import vesselInfoRoutes from './vesselInfo.js'

export default function vesselRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.register(positionRoutes, { prefix: '/position' })
    fastify.register(vesselInfoRoutes, { prefix: '/info' })

    fastify.get('/', async (request, reply) => {
        return { vessel: '404' }
    })
}
