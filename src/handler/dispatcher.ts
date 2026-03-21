import { handlePositionReportMessage } from './PositionReport.js'
import { handleShipStaticDataMessage } from './ShipStaticData.js'
import { handleBaseStationReportMessage } from './BaseStationReport.js'
import type { FastifyInstance } from 'fastify'
import chalk from 'chalk'

export async function dispatchMessage(msg: any, fastify: FastifyInstance) {
    const type = msg.MessageType

    switch (type) {
        case 'PositionReport':
            handlePositionReportMessage(msg, fastify).catch((err) => {
                console.error(chalk.red('Error handling PositionReport message:'), err)
            })
            break
        case 'ShipStaticData':
            handleShipStaticDataMessage(msg, fastify).catch((err) => {
                console.error(chalk.red('Error handling ShipStaticData message:'), err)
            })
            break
        case 'BaseStationReport':
            handleBaseStationReportMessage(msg, fastify).catch((err) => {
                console.error(chalk.red('Error handling BaseStationReport message:'), err)
            })
            break
        default:
            // console.warn('Unhandled message type. Skipping type ' + type)
    }
}
