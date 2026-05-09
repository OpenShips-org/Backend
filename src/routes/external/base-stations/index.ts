import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'
import type { PositionBoxQuery, MMSIParam } from '../types.js'
import { validateBoxParameters } from '../utils.js'
import type { BaseStationPosition } from '../../../types/aisTypes.js'
import { BaseStationPositionScheme } from '../../../schemas/baseStation.js'

export default function baseStationRoutes(
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
                        maxLat: { type: 'number' },
                        minLon: { type: 'number' },
                        maxLon: { type: 'number' },
                        limit: { type: 'integer', minimum: 1, maximum: 1000 },
                    },
                },
                response: {
                    200: {
                        type: 'array',
                        items: BaseStationPositionScheme,
                    },
                        400: { $ref: 'HttpError' },
                        500: { $ref: 'HttpError' },
                },
                tags: ['Base Stations'],
            },
        },
        async (request, reply) => {
            const validationResult = await validateBoxParameters(request.query)
            if (!validationResult.valid) {
                return reply.badRequest(validationResult.message)
            }

            let query = `
    SELECT *
    FROM base_stations
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
                const baseStations = await fastify.mariadb.query(query, params)
                return baseStations as BaseStationPosition[]
            } catch (error) {
                fastify.log.error(error, 'Error fetching base stations')
                return reply.internalServerError('Failed to fetch base stations')
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
                    200: BaseStationPositionScheme,
                    404: { $ref: 'HttpError' },
                    500: { $ref: 'HttpError' },
                },
                tags: ['Base Stations'],
            },
        },
        async (request, reply) => {
            const mmsi = request.params.mmsi

            try {
                const baseStation = await fastify.mariadb.query(
                    'SELECT * FROM base_stations WHERE mmsi = ?',
                    [mmsi]
                )

                if (baseStation.length === 0) {
                    return reply.notFound('Base station not found')
                }

                return baseStation[0] as BaseStationPosition
            } catch (error) {
                return reply.internalServerError('Failed to retrieve base station information')
            }
        }
    )
}
