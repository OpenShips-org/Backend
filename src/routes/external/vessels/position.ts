import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import type { PositionBoxQuery, MMSIParam, HistoryQuery } from '../types.js'
import { validateBoxParameters } from '../utils.js'
import type { VesselPosition } from '../../../types/aisTypes.js'
import { VesselPositionSchema } from '../../../schemas/vessel.js'

export default function positionRoutes(
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
                        minLat: { type: 'number', minimum: -90, maximum: 90 },
                        maxLat: { type: 'number', minimum: -90, maximum: 90 },
                        minLon: { type: 'number', minimum: -180, maximum: 180 },
                        maxLon: { type: 'number', minimum: -180, maximum: 180 },
                        limit: { type: 'integer', minimum: 1, maximum: 1000 },
                    },
                },
                response: {
                    200: {
                        type: 'array',
                        items: VesselPositionSchema,
                    },
                    400: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                    500: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                },
                tags: ['Vessels'],
            },
        },
        async (request, reply) => {
            const validationResult = await validateBoxParameters(request.query)
            if (!validationResult.valid) {
                return reply
                    .status(400)
                    .send({ error: validationResult.message })
            }

            let query = `
    SELECT *
    FROM vessel_positions
    WHERE latitude BETWEEN ? AND ?
      AND longitude BETWEEN ? AND ?
`

            const params = [
                request.query.minLat,
                request.query.maxLat,
                request.query.minLon,
                request.query.maxLon,
            ]

            if (request.query.limit) {
                query += ' LIMIT ?'
                params.push(request.query.limit)
            }

            try {
                const result = await fastify.mariadb.query(query, params)
                return result.rows as VesselPosition[]
            } catch (error) {
                fastify.log.error(error)
                throw fastify.httpErrors.internalServerError(
                    'Failed to retrieve vessel positions'
                )
            }
        }
    )

    fastify.get<{ Params: MMSIParam }>(
        '/:mmsi',
        {
            schema: {
                params: {
                    type: 'object',
                    required: ['mmsi'],
                    properties: {
                        mmsi: { type: 'string', pattern: '^[0-9]{9}$' },
                    },
                },
                response: {
                    200: VesselPositionSchema,
                    404: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                    500: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                },
                tags: ['Vessels'],
            },
        },
        async (request, reply) => {
            try {
                const result = await fastify.mariadb.query(
                    'SELECT * FROM current_vessel_positions WHERE mmsi = ?',
                    [request.params.mmsi]
                )

                const vessel = result.rows[0] as VesselPosition

                if (!vessel) {
                    throw fastify.httpErrors.notFound(
                        'Vessel position not found'
                    )
                }
                return vessel
            } catch (error) {
                fastify.log.error(error)
                throw fastify.httpErrors.internalServerError(
                    'Failed to retrieve vessel position'
                )
            }
        }
    )

    fastify.get<{ Params: MMSIParam; Querystring: HistoryQuery }>(
        '/history/:mmsi',
        {
            schema: {
                params: {
                    type: 'object',
                    required: ['mmsi'],
                    properties: {
                        mmsi: { type: 'string', pattern: '^[0-9]{9}$' },
                    },
                },
                querystring: {
                    type: 'object',
                    properties: {
                        limit: { type: 'integer', minimum: 1, maximum: 1000 },
                        startTime: { type: 'string', format: 'date-time' },
                        endTime: { type: 'string', format: 'date-time' },
                        order: { type: 'string', enum: ['asc', 'desc'] },
                    },
                },
                response: {
                    200: {
                        type: 'array',
                        items: VesselPositionSchema,
                    },
                    400: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                    500: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                },
                tags: ['Vessels'],
            },
        },
        async (request, reply) => {
            const { mmsi } = request.params
            const { limit, startTime, endTime, order } = request.query

            if (startTime && endTime && new Date(startTime) > new Date(endTime)) {
                throw fastify.httpErrors.badRequest('startTime must be before endTime')
            }

            let query = `
    SELECT *
    FROM historical_vessel_positions
    WHERE mmsi = ?
`
            const params: unknown[] = [mmsi]

            if (startTime) {
                query += ' AND timestamp >= ?'
                params.push(startTime)
            }
            if (endTime) {
                query += ' AND timestamp <= ?'
                params.push(endTime)
            }
            if (order) {
                query += ` ORDER BY timestamp ${order.toUpperCase()}`
            } else {
                query += ' ORDER BY timestamp DESC'
            }
            if (limit) {
                query += ' LIMIT ?'
                params.push(limit)
            }

            try {
                const result = await fastify.mariadb.query(query, params)
                return result.rows as VesselPosition[]
            } catch (error) {
                fastify.log.error(error)
                throw fastify.httpErrors.internalServerError(
                    'Failed to retrieve vessel position history'
                )
            }
        }
    )
}
