import type { FastifyInstance } from 'fastify'
import {
    parseAisStreamTimestamp,
    parseDateForDatabase,
} from '../utils/timeUtility.js'
import type { VesselPosition } from '../types/positionTypes.js'
import chalk from 'chalk';

type CachedPosition = {
    position: VesselPosition
    lastUpdated: number
}

const lastPositionsCache = new Map<number, CachedPosition>()
const historicalInsertQueue: VesselPosition[] = []
const HISTORICAL_BATCH_SIZE = 50

async function flushHistoricalQueue(fastify: FastifyInstance) {
    if (historicalInsertQueue.length === 0) return

    const rowsToInsert = historicalInsertQueue.splice(0, HISTORICAL_BATCH_SIZE)
    const values = rowsToInsert
        .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .join(',')
    const params = rowsToInsert.flatMap((r) => [
        r.mmsi,
        r.ship_name,
        r.navigation_status,
        r.rot,
        r.sog,
        r.cog,
        r.true_heading,
        r.longitude,
        r.latitude,
        r.special_manoeuvre,
        r.communication_state,
        r.timestamp,
    ])

    await fastify.mariadb.query(
        `INSERT INTO historical_vessel_positions 
        (mmsi, ship_name, navigation_status, rot, sog, cog, true_heading, longitude, latitude, special_manoeuvre, communication_state, timestamp)
        VALUES ${values}`,
        params
    )

    console.log(chalk.green(`Inserted ${rowsToInsert.length} historical position records`))

    for (const r of rowsToInsert) {
        lastPositionsCache.set(parseInt(r.mmsi), {
            position: r,
            lastUpdated: Date.now(),
        })
    }
}

setInterval(() => flushHistoricalQueue(globalThis.fastifyInstance!), 5000)
setInterval(
    () => {
        const now = Date.now()
        for (const [mmsi, cached] of lastPositionsCache.entries()) {
            if (now - cached.lastUpdated > 24 * 60 * 60 * 1000) {
                lastPositionsCache.delete(mmsi)
            }
        }
    },
    60 * 60 * 1000
)

export async function handlePositionReportMessage(
    msg: any,
    fastify: FastifyInstance
) {
    try {
        const metaData = msg.MetaData
        const positionReport = msg.Message.PositionReport

        //#region Data validation
        if (!positionReport.Valid) return
        const longitude = positionReport.Longitude
        const latitude = positionReport.Latitude
        if (
            typeof longitude !== 'number' ||
            typeof latitude !== 'number' ||
            longitude < -180 ||
            longitude > 180 ||
            latitude < -90 ||
            latitude > 90
        )
            return
        //#endregion

        //#region Timestamp validation
        const parsedTimestamp = parseAisStreamTimestamp(metaData.time_utc)
        const timestampDate = new Date(parsedTimestamp)
        if (isNaN(timestampDate.getTime())) return
        const now = new Date()
        if (Math.abs(now.getTime() - timestampDate.getTime()) > 5 * 60 * 1000)
            return
        const timestamp = parseDateForDatabase(timestampDate)
        if (!timestamp) return
        //#endregion

        //#region Data sorting
        const mmsi = metaData.MMSI
        const shipName = metaData.ShipName
        const navigationStatus = positionReport.NavigationalStatus
        const rot = positionReport.RateOfTurn
        const sog = positionReport.Sog
        const cog = positionReport.Cog
        const trueHeading = positionReport.TrueHeading
        const specialManeuver = positionReport.SpecialManoeuvreIndicator
        const communicationState = positionReport.CommunicationState
        //#endregion

        //#region Current Position Database update
        const currentResult = await fastify.mariadb.query(
            `
            INSERT INTO current_vessel_positions (
                mmsi, ship_name, navigation_status, rot, sog, cog, true_heading,
                longitude, latitude, special_manoeuvre, communication_state, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                ship_name = VALUES(ship_name),
                navigation_status = VALUES(navigation_status),
                rot = VALUES(rot),
                sog = VALUES(sog),
                cog = VALUES(cog),
                true_heading = VALUES(true_heading),
                longitude = VALUES(longitude),
                latitude = VALUES(latitude),
                special_manoeuvre = VALUES(special_manoeuvre),
                communication_state = VALUES(communication_state),
                timestamp = VALUES(timestamp)
        `,
            [
                mmsi,
                shipName,
                navigationStatus,
                rot,
                sog,
                cog,
                trueHeading,
                longitude,
                latitude,
                specialManeuver,
                communicationState,
                timestamp,
            ]
        )
        //#endregion

        //#region Historical position update
        try {
            let cached = lastPositionsCache.get(parseInt(mmsi))
            let lastPosition = cached?.position

            if (!lastPosition) {
                const historyRows = (await fastify.mariadb.query(
                    `
    SELECT mmsi, ship_name, navigation_status, rot, sog, cog, true_heading,
           longitude, latitude, special_manoeuvre, communication_state, timestamp
    FROM historical_vessel_positions
    WHERE mmsi = ?
    ORDER BY timestamp DESC
    LIMIT 1
    `,
                    [mmsi]
                )) as VesselPosition[]
                if (historyRows.length > 0) {
                    const firstRow = historyRows[0]
                    if (firstRow) {
                        lastPosition = firstRow
                        lastPositionsCache.set(parseInt(mmsi), {
                            position: lastPosition,
                            lastUpdated: Date.now(),
                        })
                    }
                }
            }

            let shouldInsertHistory = false
            if (!lastPosition) {
                shouldInsertHistory = true
            } else {
                const positionChanged =
                    lastPosition.longitude !== longitude ||
                    lastPosition.latitude !== latitude

                const lastTs = lastPosition.timestamp
                    ? new Date(lastPosition.timestamp)
                    : new Date(0)
                const nowTs = new Date(timestamp)
                const timeExceeded =
                    nowTs.getTime() - lastTs.getTime() > 60 * 60 * 1000

                if (positionChanged || timeExceeded) {
                    shouldInsertHistory = true
                }
            }

            if (shouldInsertHistory) {
                historicalInsertQueue.push({
                    mmsi,
                    ship_name: shipName,
                    navigation_status: navigationStatus,
                    rot,
                    sog,
                    cog,
                    true_heading: trueHeading,
                    longitude,
                    latitude,
                    special_manoeuvre: specialManeuver,
                    communication_state: communicationState,
                    timestamp,
                })
                if (historicalInsertQueue.length >= HISTORICAL_BATCH_SIZE) {
                    await flushHistoricalQueue(fastify)
                }
            }
        } catch (err) {
            console.error(
                chalk.red(`Error updating historical positions for MMSI ${metaData.MMSI}:`),
                err
            )
        }
        //#endregion
    } catch (err) {
        console.error(chalk.red('Error processing position report:'), err)
    }
}
