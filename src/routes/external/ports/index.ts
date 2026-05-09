import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'
import type { PositionBoxQuery } from '../types.js'
import { validateBoxParameters } from '../utils.js'
import { PortPositionSchema } from '../../../schemas/ports.js'
import type { PortPosition } from '../../../types/portType.js'

export default function portRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.get<{ Querystring: PositionBoxQuery }>(
        '/box',
        {
            schema: {
                querystring: {
                    type: 'object',
                    required: ['minLat', 'maxLat', 'minLon', 'maxLon'],
                    properties: {
                        minLat: { type: 'number' },
                        maxLat: { type: 'number'},
                        minLon: { type: 'number' },
                        maxLon: { type: 'number' },
                        limit: { type: 'integer', minimum: 1, maximum: 1000 },
                    },
                },
                response: {
                    200: {
                        type: 'array',
                        items: PortPositionSchema,
                    },
                    400: { $ref: 'HttpError' },
                    500: { $ref: 'HttpError' },
                },
                tags: ['Ports'],
            },
        },
        async (request, reply) => {
            if (!validateBoxParameters(request.query)) {
                return reply.badRequest('Invalid query parameters')
            }

            const { minLat, maxLat, minLon, maxLon, limit = 100 } = request.query

            let query = `
            SELECT world_port_index_number, main_port_name, un_locode, country_code, latitude, longitude, harbor_type, harbor_size 
            FROM ports 
            WHERE latitude BETWEEN ? AND ?
              AND longitude BETWEEN ? AND ?
            `

            const params = [
                minLat,
                maxLat,
                minLon,
                maxLon,
            ]

            if (limit) {
                query += ' LIMIT ?'
                params.push(limit)
            }

            try {
                const ports = await fastify.mariadb.query(query, params)
                return ports as PortPosition[] 
            } catch (error) {
                request.log.error('Database query failed')
                return reply.internalServerError('Failed to retrieve ports')
            }
        }
    )
}