import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import positionRoutes from './position.js';
import staticRoutes from './static.js';
import vesselPagedRoutes from './paged.js';

export default function vesselRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    
    fastify.register(positionRoutes, { prefix: '/position' });
    fastify.register(staticRoutes, { prefix: '/static' });
    fastify.register(vesselPagedRoutes, { prefix: '/paged' });

    fastify.get('/', {schema: {hide: true}}, async (request, reply) => {
        reply.notFound();
    })
}
