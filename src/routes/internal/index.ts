import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'


export default function internalRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.get('/', {schema: { hide: true }}, async (request, reply) => {
        throw fastify.httpErrors.notFound()
    })
}
