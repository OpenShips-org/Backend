import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import type { VesselBoxQuery, MMSIParam, HistoryQuery } from '../types.js'
import { validateBoxParameters } from '../utils.js'
import type { VesselPosition, VesselPositionWithType } from '../../../types/aisTypes.js'
import { VesselPositionSchema, VesselPositionSchemaWithType } from '../../../schemas/vessel.js'

export default function positionRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.get<{ Querystring: VesselBoxQuery }>(
        '/box',
        {
            schema: {
                querystring: {
                    type: 'object',
                    required: ['minLat', 'maxLat', 'minLon', 'maxLon'],
                    properties: {
                        minLat: { type: 'number' },
                        maxLat: { type: 'number' },
                        minLon: { type: 'number' },
                        maxLon: { type: 'number' },
                        limit: { type: 'integer', minimum: 1, maximum: 100000 },
                        filterAisTypes: {
                            type: 'array',
                            items: { type: 'integer', minimum: 0, maximum: 99 },
                            uniqueItems: true,
                        },
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
            const validationResult = await validateBoxParameters(request.query)
            if (!validationResult.valid) {
                return reply.badRequest(validationResult.message)
            }

            let query = `
        SELECT vp.*, s.vesselType AS aisType
        FROM current_vessel_positions vp
        LEFT JOIN static_ship_data s ON s.mmsi = vp.mmsi
        WHERE vp.latitude BETWEEN ? AND ?
            AND vp.longitude BETWEEN ? AND ?
`

            const params = [
                request.query.minLat,
                request.query.maxLat,
                request.query.minLon,
                request.query.maxLon,
            ]

            try {
                if (request.query.filterAisTypes && request.query.filterAisTypes.length > 0) {
                    query += `
      AND s.vesselType IN (${request.query.filterAisTypes.map(() => '?').join(',')})
`
                    params.push(...request.query.filterAisTypes)
                }

                if (request.query.limit) {
                    query += ' LIMIT ?'
                    params.push(request.query.limit)
                }

                const result = await fastify.mariadb.query(query, params)
                return result as VesselPositionWithType[]
            } catch (error) {
                fastify.log.error(error)
                return reply.internalServerError('Failed to retrieve vessel positions')
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
                            mmsi: { type: 'integer', minimum: 100000000, maximum: 999999999 },
                    },
                },
                response: {
                    200: VesselPositionSchema,
                    400: { $ref: 'HttpError' },
                    404: { $ref: 'HttpError' },
                    500: { $ref: 'HttpError' },
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

                const vessel = result[0] as VesselPosition

                if (!vessel) {
                    throw fastify.httpErrors.notFound(
                        'Vessel position not found'
                    )
                }
                return vessel
            } catch (error) {
                fastify.log.error(error)
                return reply.internalServerError('Failed to retrieve vessel position')
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
                            mmsi: { type: 'integer', minimum: 100000000, maximum: 999999999 },
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
                    400: { $ref: 'HttpError' },
                    404: { $ref: 'HttpError' },
                    500: { $ref: 'HttpError' },
                },
                tags: ['Vessels'],
            },
        },
        async (request, reply) => {
            const { mmsi } = request.params
            const { limit, startTime, endTime, order } = request.query

            if (startTime && endTime && new Date(startTime) > new Date(endTime)) {
                return reply.badRequest('startTime must be before endTime')
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
                return result as VesselPosition[]
            } catch (error) {
                fastify.log.error(error)
                return reply.internalServerError('Failed to retrieve vessel position history')
            }
        }
    )
}
