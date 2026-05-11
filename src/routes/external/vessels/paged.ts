import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'
import { VesselPositionSchemaWithType } from '../../../schemas/vessel.js'

export default function vesselPagedRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.get<{ Querystring: { page: number; pageSize: number; sortBy: string; sortOrder: 'ASC' | 'DESC' } }>(
        '/list',
        {
            schema: {
                querystring: {
                    type: 'object',
                    required: ['page', 'pageSize'],
                    properties: {
                        page: { type: 'integer', minimum: 1 },
                        pageSize: { type: 'integer', minimum: 1, maximum: 1000 },
                        sortBy: { type: 'string', enum: ['mmsi', 'latitude', 'longitude', 'speed', 'course', 'timestamp', 'vesselName'] },
                        sortOrder: { type: 'string', enum: ['ASC', 'DESC'] },
                    },
                },
                response: {
                    200: {
                        type: 'array',
                        items: VesselPositionSchemaWithType,
                    },
                    400: { $ref: 'HttpError' },
                    500: { $ref: 'HttpError' },
                },
                tags: ['Vessels'],
            },
        },
        async (request, reply) => {
            const { page, pageSize, sortBy, sortOrder } = request.query
            const offset = (page - 1) * pageSize

            try {
                const [rows] = await fastify.mariadb.query(
                    `
          SELECT vp.*, s.vesselType
          FROM current_vessel_positions vp
          LEFT JOIN static_ship_data s ON s.mmsi = vp.mmsi
          ORDER BY ${sortBy} ${sortOrder}
          LIMIT ? OFFSET ?
        `,
                    [pageSize, offset]
                )
                return rows
            } catch (error) {
                request.log.error('Database query failed: ' + error)
                return reply.internalServerError('Failed to retrieve vessel data')
            }
        }
    )

    fastify.get<{ Querystring: { page: number; pageSize: number; sortBy: string; sortOrder: 'ASC' | 'DESC' } }>(
        '/mmsi-list',
        {
            schema: {
                querystring: {
                    type: 'object',
                    required: ['page', 'pageSize'],
                    properties: {
                        page: { type: 'integer', minimum: 1 },
                        pageSize: { type: 'integer', minimum: 1, maximum: 999999999 },
                        sortBy: { type: 'string', enum: ['mmsi', 'latitude', 'longitude', 'speed', 'course', 'timestamp', 'vesselName'] },
                        sortOrder: { type: 'string', enum: ['ASC', 'DESC'] },
                    },
                },
                response: {
                    200: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                    500: { $ref: 'HttpError' },
                },
                tags: ['Vessels'],
            },
        },
        async (request, reply) => {
            try {
                const [rows] = await fastify.mariadb.query(
                    `
          SELECT DISTINCT mmsi
          FROM current_vessel_positions
          ORDER BY ${request.query.sortBy} ${request.query.sortOrder}
          LIMIT ? OFFSET ?
        `,
                    [request.query.pageSize, (request.query.page - 1) * request.query.pageSize]
                )
                return rows.map((row: any) => row.mmsi)
            } catch (error) {
                request.log.error('Database query failed: ' + error)
                return reply.internalServerError('Failed to retrieve MMSI list')
            }
        }
    )

    fastify.get(
        '/mmsi-count',
        {
            schema: {
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            count: { type: 'integer' },
                        },
                    },
                    500: { $ref: 'HttpError' },
                },
                tags: ['Vessels'],
            },
        },
        async (request, reply) => {
            try {
                const [rows] = await fastify.mariadb.query(
                    'SELECT COUNT(DISTINCT mmsi) AS count FROM current_vessel_positions'
                )
                return { count: rows[0].count }
            } catch (error) {
                request.log.error('Database query failed: ' + error)
                return reply.internalServerError('Failed to retrieve MMSI count')
            }
        }
    )
}