import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

export default function vesselRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    

    fastify.get('/', async (request, reply) => {
        reply.notFound();
    })
}
