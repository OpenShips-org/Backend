import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import internalRoutes from './internal/index.js'
import externalRoutes from './external/index.js'

export default function Routes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.register(internalRoutes, { prefix: '/internal' })
    fastify.register(externalRoutes, { prefix: '/external' })

    fastify.get('/', async (request, reply) => {
        return {}
    })
}
