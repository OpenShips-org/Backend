import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

import type { VesselPosition } from '../../../types/aisTypes.js'

interface PositionParams {
    mmsi: number
}

interface PositionQuery {
    limit?: number
    minLat?: number
    maxLat?: number
    minLon?: number
    maxLon?: number
}

interface HistoryQuery {
    limit?: number
    start?: string
    end?: string
}

async function positionRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.get<{ Params: PositionParams; Querystring: PositionQuery }>(
        '/:mmsi/current',
        async (request, reply) => {
            const { mmsi } = request.params

            //#region Validation
            const mmsiNumber = Number(mmsi)
            if (isNaN(mmsiNumber) || mmsiNumber <= 0) {
                return reply.status(400).send({ error: 'Invalid MMSI' })
            }
            //#endregion
            
            const response: VesselPosition[] = await fastify.mariadb.query(
                `SELECT * 
             FROM current_vessel_positions
                WHERE mmsi = ?`,
                [mmsiNumber]
            )

            if (!response || response.length === 0) {
                return reply
                    .status(404)
                    .send({ error: 'Position not found for the given MMSI' })
            }

            const position: VesselPosition = response[0]!

            if (position.timestamp) {
                try {
                    position.timestamp = new Date(
                        position.timestamp
                    ).toISOString()
                } catch (err) {}
            }
            return reply.send(position)
        }
    )

    fastify.get<{ Querystring: HistoryQuery, Params: PositionParams }>(
        '/:mmsi/history',
        async (request, reply) => {

            const { mmsi } = request.params
            const { limit = 100, start, end } = request.query

            //#region Validation
            const mmsiNumber = Number(mmsi)
            if (isNaN(mmsiNumber) || mmsiNumber <= 0) {
                return reply.status(400).send({ error: 'Invalid MMSI' })
            }

            const limitNumber = Number(limit)
            if (isNaN(limitNumber) || limitNumber <= 0) {
                return reply.status(400).send({ error: 'Invalid limit' })
            }

            if (limitNumber > 1000) {
                return reply.status(400).send({ error: 'Limit too high, max 1000' })
            }

            let whereClauses: string[] = ['mmsi = ?']
            let values: any[] = [mmsiNumber]

            if (start) {
                const startDate = new Date(start)
                if (isNaN(startDate.getTime())) {
                    return reply.status(400).send({ error: 'Invalid start date' })
                }
                whereClauses.push('timestamp >= ?')
                values.push(startDate.toISOString())
            }
            if (end) {
                const endDate = new Date(end)
                if (isNaN(endDate.getTime())) {
                    return reply.status(400).send({ error: 'Invalid end date' })
                }
                whereClauses.push('timestamp <= ?')
                values.push(endDate.toISOString())
            }

            if (start && end) {
                const startDate = new Date(start)
                const endDate = new Date(end)
                if (startDate > endDate) {
                    return reply.status(400).send({ error: 'Start date must be before end date' })
                }
            }
            //#endregion

            //#region Query Construction
            let sql = 'SELECT * FROM historical_vessel_positions'
            if (whereClauses.length)
                sql += ' WHERE ' + whereClauses.join(' AND ')
            sql += ' ORDER BY timestamp DESC LIMIT ?'
            values.push(limitNumber)
            //#endregion

            const response: VesselPosition[] = await fastify.mariadb.query(
                sql,
                values
            )

            const positions: VesselPosition[] = response.map(formatTimestamp)

            return reply.send(positions)
        }
    )

    fastify.get<{ Querystring: PositionQuery }>(
        '/box',
        async (request, reply) => {
            const {
                limit = 100,
                minLat,
                maxLat,
                minLon,
                maxLon,
            } = request.query

            //#region Validation
            const limitNumber = Number(limit)
            const minLatNumber =
                minLat !== undefined ? Number(minLat) : undefined
            const maxLatNumber =
                maxLat !== undefined ? Number(maxLat) : undefined
            const minLonNumber =
                minLon !== undefined ? Number(minLon) : undefined
            const maxLonNumber =
                maxLon !== undefined ? Number(maxLon) : undefined

            if (isNaN(limitNumber) || limitNumber <= 0) {
                return reply.status(400).send({ error: 'Invalid limit' })
            }
            if (
                minLat !== undefined &&
                (isNaN(minLatNumber!) ||
                    minLatNumber! < -90 ||
                    minLatNumber! > 90)
            ) {
                return reply.status(400).send({ error: 'Invalid minLat' })
            }
            if (
                maxLat !== undefined &&
                (isNaN(maxLatNumber!) ||
                    maxLatNumber! < -90 ||
                    maxLatNumber! > 90)
            ) {
                return reply.status(400).send({ error: 'Invalid maxLat' })
            }
            if (
                minLon !== undefined &&
                (isNaN(minLonNumber!) ||
                    minLonNumber! < -180 ||
                    minLonNumber! > 180)
            ) {
                return reply.status(400).send({ error: 'Invalid minLon' })
            }
            if (
                maxLon !== undefined &&
                (isNaN(maxLonNumber!) ||
                    maxLonNumber! < -180 ||
                    maxLonNumber! > 180)
            ) {
                return reply.status(400).send({ error: 'Invalid maxLon' })
            }

            if (minLatNumber !== undefined && maxLatNumber !== undefined && minLatNumber > maxLatNumber) {
                return reply.status(400).send({ error: 'minLat must be less than or equal to maxLat' })
            }
            if (minLonNumber !== undefined && maxLonNumber !== undefined && minLonNumber > maxLonNumber) {
                return reply.status(400).send({ error: 'minLon must be less than or equal to maxLon' })
            }
            //#endregion

            //#region Query Construction
            let whereClauses: string[] = []
            let values: any[] = []

            if (minLatNumber !== undefined) {
                whereClauses.push('latitude >= ?')
                values.push(minLatNumber)
            }
            if (maxLatNumber !== undefined) {
                whereClauses.push('latitude <= ?')
                values.push(maxLatNumber)
            }
            if (minLonNumber !== undefined) {
                whereClauses.push('longitude >= ?')
                values.push(minLonNumber)
            }
            if (maxLonNumber !== undefined) {
                whereClauses.push('longitude <= ?')
                values.push(maxLonNumber)
            }

            let sql = 'SELECT * FROM current_vessel_positions'
            if (whereClauses.length)
                sql += ' WHERE ' + whereClauses.join(' AND ')
            sql += ' LIMIT ?'
            values.push(limitNumber)
            //#endregion

            const response: VesselPosition[] = await fastify.mariadb.query(
                sql,
                values
            )

            const positions: VesselPosition[] = response.map(formatTimestamp)

            return reply.send(positions)
        }
    )
}

function formatTimestamp(pos: VesselPosition) {
    if (pos.timestamp) {
        const date = new Date(pos.timestamp)
        if (!isNaN(date.getTime())) pos.timestamp = date.toISOString()
    }
    return pos
}

export default positionRoutes
