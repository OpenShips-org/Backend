import { handlePositionReportMessage } from './handler/PositionReport.js'
import { handleShipStaticDataMessage } from './handler/ShipStaticData.js'
import { handleBaseStationReportMessage } from './handler/BaseStationReport.js'
import type { FastifyInstance } from 'fastify'

export async function dispatchMessage(msg: any, fastify: FastifyInstance) {
    const type = msg.MessageType

    switch (type) {
        case 'PositionReport':
            await handlePositionReportMessage(msg, fastify)
            break
        case 'ShipStaticData':
            await handleShipStaticDataMessage(msg, fastify)
            break
        case 'BaseStationReport':
            await handleBaseStationReportMessage(msg, fastify)
            break
        default:
            // console.warn('Unhandled message type. Skipping type ' + type)
    }
}
