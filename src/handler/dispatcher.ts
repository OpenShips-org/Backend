import { handlePositionReportMessage } from './PositionReport.js'
import { handleShipStaticDataMessage } from './ShipStaticData.js'
import { handleBaseStationReportMessage } from './BaseStationReport.js'
import type { FastifyInstance } from 'fastify'
import chalk from 'chalk'

export const messageCounters = {
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

// Backpressure / throttling queue
const MESSAGE_CONCURRENCY = Number(process.env.MESSAGE_CONCURRENCY) || 5
const MESSAGE_QUEUE_MAX = Number(process.env.MESSAGE_QUEUE_MAX) || 10000

type QueueItem = { msg: any; fastify: FastifyInstance }
const queue: QueueItem[] = []
let activeWorkers = 0

function enqueue(item: QueueItem) {
    if (queue.length >= MESSAGE_QUEUE_MAX) {
        // Drop message to avoid unbounded memory/CPU usage
        messageCounters.Other++
        console.warn(chalk.yellow('Message queue full — dropping message'))
        return
    }

    queue.push(item)
    processQueue()
}

async function processQueue() {
    if (activeWorkers >= MESSAGE_CONCURRENCY) return
    if (queue.length === 0) return

    const item = queue.shift()!
    activeWorkers++

    try {
        const type = item.msg.MessageType

        if (type === 'PositionReport') {
            messageCounters.PositionReport++
            await handlePositionReportMessage(item.msg, item.fastify)
        } else if (type === 'ShipStaticData') {
            messageCounters.ShipStaticData++
            await handleShipStaticDataMessage(item.msg, item.fastify)
        } else if (type === 'BaseStationReport') {
            messageCounters.BaseStationReport++
            await handleBaseStationReportMessage(item.msg, item.fastify)
        } else {
            messageCounters.Other++
            // unknown message types are ignored
        }
    } catch (err) {
        console.error(chalk.red('Error handling message from queue:'), err)
    } finally {
        activeWorkers--
        // schedule next run allowing event loop breathing
        setImmediate(() => processQueue())
    }
}

export function dispatchMessage(msg: any, fastify: FastifyInstance) {
    enqueue({ msg, fastify })
}
