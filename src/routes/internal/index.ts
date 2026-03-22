import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import vesselRoutes from './vessel/index.js'

export default function internalRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.register(vesselRoutes, { prefix: '/vessel' })

    fastify.get('/', {schema: { hide: true }}, async (request, reply) => {
        throw fastify.httpErrors.notFound()
    })
}
