import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import positionRoutes from './position.js';
import staticRoutes from './static.js';

export default function vesselRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    
    fastify.register(positionRoutes, { prefix: '/position' });
    fastify.register(staticRoutes, { prefix: '/static' });

    fastify.get('/', {schema: {hide: true}}, async (request, reply) => {
        reply.notFound();
    })
}
