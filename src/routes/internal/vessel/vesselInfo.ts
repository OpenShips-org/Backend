import type { FastifyInstance } from 'fastify'
import type { FastifyPluginOptions } from 'fastify'

interface VesselInfoParams {
    mmsi: number
}

async function vesselInfoRoutes(
    fastify: FastifyInstance,
    options: FastifyPluginOptions
) {
    fastify.get<{ Params: VesselInfoParams }>('/:mmsi/static', async (request, reply) => {
        const { mmsi } = request.params

        const mmsiNumber = Number(mmsi)
        if (isNaN(mmsiNumber) || mmsiNumber <= 0) {
            return reply.status(400).send({ error: 'Invalid MMSI' })
        }

        const response = await fastify.mariadb.query(
            `SELECT * 
             FROM static_ship_data
                WHERE mmsi = ?`,
            [mmsiNumber]
        )

        if (!response || response.length === 0) {
            return reply
                .status(404)
                .send({ error: 'Vessel info not found for the given MMSI' })
        }

        return reply.send(response[0]!)
    })
}

export default vesselInfoRoutes