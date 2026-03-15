import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

async function positionRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.get('/', async (request, reply) => {
        return { vessel: '404' }
    })
}

export default positionRoutes
