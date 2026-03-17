import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import vesselRoutes from './internal/index.js'

export default function Routes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.register(vesselRoutes, { prefix: '/internal' })

    fastify.get('/', async (request, reply) => {
        return { vessel: '404' }
    })
}
