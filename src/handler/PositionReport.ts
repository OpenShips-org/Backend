import type { FastifyInstance } from 'fastify'
import {
    parseAisStreamTimestamp,
    parseDateForDatabase,
} from '../utils/dateUtility.js'
import type { VesselPosition } from '../types/aisTypes.js'
import chalk from 'chalk';

type CachedPosition = {
    position: VesselPosition
    lastUpdated: number
}

const lastPositionsCache = new Map<number, CachedPosition>()
const historicalBatch: any[] = []

const batchSize = 500

setInterval(
    () => {
        const now = Date.now()
        for (const [mmsi, cached] of lastPositionsCache.entries()) {
            if (now - cached.lastUpdated > 5 * 60 * 1000) {
                lastPositionsCache.delete(mmsi)
            }
        }
    },
    60 * 1000
)

export async function loadLastPositionsFromDatabase(fastify: FastifyInstance) {
    try {
        const results = await fastify.mariadb.query(
            'SELECT * from current_vessel_positions LIMIT 10000'
        )
        for (const row of results) {
            const mmsi = row.mmsi
            const position: VesselPosition = {
                mmsi: row.mmsi,
                shipName: row.ship_name,
                navigationStatus: row.navigation_status,
                rot: row.rot,
                sog: row.sog,
                cog: row.cog,
                trueHeading: row.true_heading,
                longitude: row.longitude,
                latitude: row.latitude,
                specialManoeuvre: row.special_manoeuvre,
                communicationState: row.communication_state,
                timestamp: row.timestamp,
            }
            lastPositionsCache.set(mmsi, {
                position,
                lastUpdated: Date.now(),
            })
        }
        console.log(chalk.green(`Loaded ${lastPositionsCache.size} recent positions into cache`))
    } catch (err) {
        console.error(chalk.red('Error loading last positions from database:'), err)
    }
}

export function startHistoricalBatchFlush(fastify: FastifyInstance) {
    setInterval(async () => {
        if (historicalBatch.length === 0) return
        const placeholders = historicalBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
        const flatValues = historicalBatch.flat()
        try {
            await fastify.mariadb.query(
                `
                INSERT INTO historical_vessel_positions (
                    mmsi, ship_name, navigation_status, rot, sog, cog, true_heading,
                    longitude, latitude, special_manoeuvre, communication_state, timestamp
                ) VALUES ${placeholders}
            `,
                flatValues
            )
            const flushedCount = historicalBatch.length
            historicalBatch.length = 0
            console.log(chalk.green(`Flushed ${flushedCount} historical positions to database`))
        } catch (err) {
            console.error(chalk.red('Error flushing historical batch:'), err)
        }
    }, 5000)
}

export async function handlePositionReportMessage(
    msg: any,
    fastify: FastifyInstance
) {

    if (lastPositionsCache.size === 0) {
        await loadLastPositionsFromDatabase(fastify)
    }

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
        if (timestampDate.getTime() > now.getTime()) {
            console.log(chalk.red(`Skipping received position report with future timestamp: ${timestampDate.toISOString()}`))
            return
        }
        if (Math.abs(now.getTime() - timestampDate.getTime()) > 5 * 60 * 1000)
            return
        const timestamp = parseDateForDatabase(timestampDate)
        if (!timestamp) return
        //#endregion

        //#region Data sorting
        const mmsi = metaData.MMSI
        const shipName = metaData.ShipName.trim()
        const navigationStatus = positionReport.NavigationalStatus
        const rot = positionReport.RateOfTurn
        const sog = positionReport.Sog
        const cog = positionReport.Cog
        const trueHeading = positionReport.TrueHeading
        const specialManoeuvre = positionReport.SpecialManoeuvreIndicator
        const communicationState = positionReport.CommunicationState

        const mmsiNumber = Number(mmsi)
        if (isNaN(mmsiNumber) || mmsiNumber <= 0) {
            return
        }
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
                specialManoeuvre,
                communicationState,
                timestamp,
            ]
        )
        //#endregion

        //#region Historical position update
        try { 

            let cached = lastPositionsCache.get(parseInt(mmsi))
            
            if (!cached) {
                const [dbResult] = await fastify.mariadb.query(
                    'SELECT * FROM current_vessel_positions WHERE mmsi = ?',
                    [mmsi]
                )
                if (dbResult) {
                    cached = {
                        position: {
                            mmsi: dbResult.mmsi,
                            shipName: dbResult.ship_name,
                            navigationStatus: dbResult.navigation_status,
                            rot: dbResult.rot,
                            sog: dbResult.sog,
                            cog: dbResult.cog,
                            trueHeading: dbResult.true_heading,
                            longitude: dbResult.longitude,
                            latitude: dbResult.latitude,
                            specialManoeuvre: dbResult.special_manoeuvre,
                            communicationState: dbResult.communication_state,
                            timestamp: dbResult.timestamp,
                        },
                        lastUpdated: Date.now(),
                    }
                    lastPositionsCache.set(parseInt(mmsi), cached)
                }
            }

            const lastPosition = cached ? cached.position : null

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
                historicalBatch.push([
                    mmsi,
                    shipName,
                    navigationStatus,
                    rot,
                    sog,
                    cog,
                    trueHeading,
                    longitude,
                    latitude,
                    specialManoeuvre,
                    communicationState,
                    timestamp,
                ])
            }

            if (historicalBatch.length >= batchSize) {
                const placeholders = historicalBatch
                    .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                    .join(', ')
                const flatValues = historicalBatch.flat()
                await fastify.mariadb.query(
                    `
                    INSERT INTO historical_vessel_positions (
                        mmsi, ship_name, navigation_status, rot, sog, cog, true_heading,
                        longitude, latitude, special_manoeuvre, communication_state, timestamp
                    ) VALUES ${placeholders}
                `,
                    flatValues
                )
                const flushedCount = historicalBatch.length
                historicalBatch.length = 0
                console.log(chalk.green(`Flushed ${flushedCount} historical positions to database`))
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
