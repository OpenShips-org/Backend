import { handlePositionReportMessage } from './PositionReport.js'
import { handleShipStaticDataMessage } from './ShipStaticData.js'
import { handleBaseStationReportMessage } from './BaseStationReport.js'
import type { FastifyInstance } from 'fastify'
import chalk from 'chalk'

const messageCounters = {
    PositionReport: 0,
    ShipStaticData: 0,
    BaseStationReport: 0,
    Other: 0,
}

let lastCounterReset = Date.now()

setInterval(() => {
    const elapsed = Date.now() - lastCounterReset
    console.log(chalk.magenta(`Message types (last ${elapsed}ms):`), messageCounters)
    messageCounters.PositionReport = 0
    messageCounters.ShipStaticData = 0
    messageCounters.BaseStationReport = 0
    messageCounters.Other = 0
    lastCounterReset = Date.now()
}, 10000)

export async function dispatchMessage(msg: any, fastify: FastifyInstance) {
    const type = msg.MessageType
    
    if (type === 'PositionReport') {
        messageCounters.PositionReport++
    } else if (type === 'ShipStaticData') {
        messageCounters.ShipStaticData++
    } else if (type === 'BaseStationReport') {
        messageCounters.BaseStationReport++
    } else {
        messageCounters.Other++
    }

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
