import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import positionRoutes from './position.js'

export default function vesselRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.register(positionRoutes, { prefix: '/position' })

    fastify.get('/', async (request, reply) => {
        return { vessel: '404' }
    })
}
