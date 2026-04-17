import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'
import type { MMSIParam, VesselStaticInfoQuery } from '../types.js'
import type { VesselData } from '../../../types/scraperTypes.js'
import { VesselStaticSchema } from '../../../schemas/vessel.js'

function toIsoString(value: unknown): string | undefined {
    if (!value) return undefined

    if (value instanceof Date) {
        return value.toISOString()
    }

    if (typeof value === 'string') {
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString()
        }
    }

    return undefined
}

function toScrapedVesselData(value: VesselData) {
    return {
        imoNumber: value.imoNumber,
        mmsiNumber: value.mmsiNumber ?? undefined,
        vesselName: value.vesselName ?? undefined,
        flag: value.flag ?? undefined,
        callSign: value.callSign ?? undefined,
        vesselType: value.vesselType ?? undefined,
        grossTonnage: value.grossTonnage ?? undefined,
        dwt: value.dwt ?? undefined,
        yearBuilt: value.yearBuilt ?? undefined,
        status: value.status ?? undefined,
        statusDate: toIsoString(value.statusDate),
        lastUpdate: toIsoString(value.lastUpdate),
        hasDnvEntry: value.hasDnvEntry,
        hasEquasisEntry: value.hasEquasisEntry,
        dnvData: value.dnvData,
        equasisData: value.equasisData,
    }
}

export default function staticRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.get<{ Params: MMSIParam; Querystring: VesselStaticInfoQuery }>(
        '/:mmsi',
        {
            schema: {
                params: {
                    type: 'object',
                    required: ['mmsi'],
                    properties: {
                        mmsi: {
                            type: 'integer',
                            minimum: 100000000,
                            maximum: 999999999,
                        },
                    },
                },
                querystring: {
                    type: 'object',
                    properties: {
                        scrapedData: { type: 'boolean' },
                    },
                },
                response: {
                    200: VesselStaticSchema,
                    400: {
                        type: 'object',
                        properties: {
                                statusCode: { type: 'integer', example: 400 },
                                error: { type: 'string', example: 'Bad Request' },
                                message: { type: 'string', example: 'Invalid MMSI or query parameters' },
                        },
                    },
                    404: {
                        type: 'object',
                        properties: {
                                statusCode: { type: 'integer', example: 404 },
                                error: { type: 'string', example: 'Not Found' },
                                message: { type: 'string', example: 'Vessel with the specified MMSI not found' },
                        },
                    },
                    500: {
                        type: 'object',
                        properties: {
                                statusCode: { type: 'integer', example: 500 },
                                error: { type: 'string', example: 'Internal Server Error' },
                                message: { type: 'string', example: 'An error occurred while fetching vessel data' },
                        },
                    },
                },
                tags: ['Vessels'],
            },
        },
        async (request, reply) => {
            const mmsi = request.params.mmsi

            try {
                const staticRows = await fastify.mariadb.query(
                    'SELECT * FROM static_ship_data WHERE mmsi = ?',
                    [mmsi]
                )

                if (!staticRows || staticRows.length === 0) {
                    return reply.notFound(
                        'Vessel with the specified MMSI not found'
                    )
                }

                const staticRow = staticRows[0]

                const vessel = {
                    mmsi: Number(staticRow.mmsi),
                    vesselName: staticRow.vesselName,
                    imo: Number(staticRow.imo),
                    callSign: staticRow.callSign,
                    destination: staticRow.destination,
                    vesselType: staticRow.vesselType,
                    maxDraught: staticRow.maxDraught,
                    dimensionA: staticRow.dimensionA,
                    dimensionB: staticRow.dimensionB,
                    dimensionC: staticRow.dimensionC,
                    dimensionD: staticRow.dimensionD,
                    eta: toIsoString(staticRow.eta),
                    timestamp: toIsoString(staticRow.timestamp),
                }

                if (request.query.scrapedData && !Number.isNaN(vessel.imo)) {
                    const scrapedResult =
                        await fastify.scraper.requestVesselData(vessel.imo)

                    if (scrapedResult.status === 'cached') {
                        return {
                            ...vessel,
                            scrapedDataStatus: 'cached',
                            scrapedVesselData: toScrapedVesselData(
                                scrapedResult.data
                            ),
                        }
                    }
                }

                return {
                    ...vessel,
                    scrapedDataStatus: request.query.scrapedData
                        ? 'in queue'
                        : 'not requested',
                }
            } catch (error) {
                fastify.log.error(error)
                return reply.internalServerError(
                    'An error occurred while fetching vessel data'
                )
            }
        }
    )
}
