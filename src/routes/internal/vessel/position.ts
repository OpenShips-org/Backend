import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import type { VesselPosition } from '../../../types/positionTypes.js'

interface PositionParams {
    mmsi: number,
}

interface PositionQuery {
    limit?: number,
    minLat?: number,
    maxLat?: number,
    minLon?: number,
    maxLon?: number,
}

async function positionRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.get<{ Params: PositionParams, Querystring: PositionQuery }>('/:mmsi/current', async (request, reply) => {

        const { mmsi } = request.params
        const { limit, minLat, maxLat, minLon, maxLon } = request.query

        if (isNaN(mmsi) || mmsi <= 0) {
            return reply.status(400).send({ error: 'Invalid MMSI' })
        }

        if ((minLat !== undefined && maxLat !== undefined && minLat > maxLat) ||
            (minLon !== undefined && maxLon !== undefined && minLon > maxLon)) {
            return reply.status(400).send({ error: 'Invalid bounding box' })
        }

        const numericLimit = limit ? Number(limit) : undefined
        if (numericLimit !== undefined && (isNaN(numericLimit) || numericLimit <= 0)) {
            return reply.status(400).send({ error: 'Invalid limit' })
        }

        //#region Query
        let query = 'SELECT * FROM current_vessel_positions WHERE mmsi = ?'
        const queryParams: (number | string)[] = [mmsi]

        if (minLat !== undefined) {
            query += ' AND latitude >= ?'
            queryParams.push(minLat)
        }
        if (maxLat !== undefined) {
            query += ' AND latitude <= ?'
            queryParams.push(maxLat)
        }
        if (minLon !== undefined) {
            query += ' AND longitude >= ?'
            queryParams.push(minLon)
        }
        if (maxLon !== undefined) {
            query += ' AND longitude <= ?'
            queryParams.push(maxLon)
        }
        if (limit !== undefined) {
            query += ' LIMIT ?'
            queryParams.push(limit)
        }

        const result = await fastify.mariadb.query(query, queryParams)
        //#endregion

        if (result.length === 0) {
            return reply.status(404).send({ error: 'Position not found for the given MMSI' })
        }

        const position: VesselPosition = result[0]
        if (position.timestamp) {
            try {
                position.timestamp = new Date(position.timestamp).toISOString()
            } catch (err) {
            }
        }
        return reply.send(position)
    })
}

export default positionRoutes
