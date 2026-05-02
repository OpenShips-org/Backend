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

// Increase batch size to reduce DB round-trips
const batchSize = 1000

// Reduce cleanup frequency to lower CPU usage
setInterval(() => {
    const now = Date.now()
    for (const [mmsi, cached] of lastPositionsCache.entries()) {
        if (now - cached.lastUpdated > 5 * 60 * 1000) {
            lastPositionsCache.delete(mmsi)
        }
    }
}, 5 * 60 * 1000)

export async function loadLastPositionsFromDatabase(fastify: FastifyInstance) {
    try {
        const results = await fastify.mariadb.query(
            'SELECT * from current_vessel_positions LIMIT 10000'
        )
        for (const row of results) {
            const mmsi = row.mmsi
            const position: VesselPosition = {
                mmsi: row.mmsi,
                vesselName: row.vessel_name,
                navigationalStatus: row.navigational_status,
                rateOfTurn: row.rate_of_turn,
                speedOverGround: row.speed_over_ground,
                courseOverGround: row.course_over_ground,
                heading: row.heading,
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
    // Flush less often to reduce CPU/DB contention
    setInterval(async () => {
        if (historicalBatch.length === 0) return
        const placeholders = historicalBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
        const flatValues = historicalBatch.flat()
        try {
            await fastify.mariadb.query(
                `
                INSERT INTO historical_vessel_positions (
                    mmsi, vesselName, navigationalStatus, rateOfTurn, speedOverGround, courseOverGround, heading,
                    longitude, latitude, specialManoeuvre, communicationState, timestamp
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
    }, 15 * 1000)
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
        const vesselName = metaData.ShipName.trim()
        const navigationalStatus = positionReport.NavigationalStatus
        const rateOfTurn = positionReport.RateOfTurn
        const speedOverGround = positionReport.Sog
        const courseOverGround = positionReport.Cog
        const heading = positionReport.TrueHeading
        const specialManoeuvre = positionReport.SpecialManoeuvreIndicator
        const communicationState = positionReport.CommunicationState

        const mmsiNumber = Number(mmsi)
        if (isNaN(mmsiNumber) || mmsiNumber <= 0) {
            return
        }
        //#endregion

        //#region Optimize: avoid unnecessary DB writes

        // Try to get cached position; if missing, load from DB once
        let cached = lastPositionsCache.get(mmsiNumber)
        if (!cached) {
            const [dbResult] = await fastify.mariadb.query(
                'SELECT * FROM current_vessel_positions WHERE mmsi = ?',
                [mmsi]
            )
            if (dbResult) {
                cached = {
                    position: {
                        mmsi: dbResult.mmsi,
                        vesselName: dbResult.vessel_name,
                        navigationalStatus: dbResult.navigational_status,
                        rateOfTurn: dbResult.rate_of_turn,
                        speedOverGround: dbResult.speed_over_ground,
                        courseOverGround: dbResult.course_over_ground,
                        heading: dbResult.heading,
                        longitude: dbResult.longitude,
                        latitude: dbResult.latitude,
                        specialManoeuvre: dbResult.special_manoeuvre,
                        communicationState: dbResult.communication_state,
                        timestamp: dbResult.timestamp,
                    },
                    lastUpdated: Date.now(),
                }
                lastPositionsCache.set(mmsiNumber, cached)
            }
        }

        const lastPosition = cached ? cached.position : null

        // If the incoming timestamp is not newer than the last known position, skip DB work
        const incomingTs = new Date(timestamp).getTime()
        const lastTs = lastPosition && lastPosition.timestamp ? new Date(lastPosition.timestamp).getTime() : 0
        if (incomingTs <= lastTs) {
            // Update cache lastUpdated so we don't evict active MMSIs
            if (cached) cached.lastUpdated = Date.now()
            return
        }
        //#endregion

        //#region Historical position update
        try {
            // Use the cached value we loaded earlier (if any)
            const existingPosition = lastPosition

            let shouldInsertHistory = false
            if (!existingPosition) {
                shouldInsertHistory = true
            } else {
                const positionChanged =
                    Math.round(existingPosition.longitude! * 1e3) !== Math.round(longitude * 1e3) ||
                    Math.round(existingPosition.latitude! * 1e3) !== Math.round(latitude * 1e3)

                const lastTsDate = existingPosition.timestamp ? new Date(existingPosition.timestamp) : new Date(0)
                const nowTs = new Date(timestamp)
                const timeExceeded = nowTs.getTime() - lastTsDate.getTime() > 60 * 60 * 1000

                if (positionChanged || timeExceeded) shouldInsertHistory = true
            }

            if (shouldInsertHistory) {
                historicalBatch.push([
                    mmsi,
                    vesselName,
                    navigationalStatus,
                    rateOfTurn,
                    speedOverGround,
                    courseOverGround,
                    heading,
                    longitude,
                    latitude,
                    specialManoeuvre,
                    communicationState,
                    timestamp,
                ])
            }

            if (historicalBatch.length >= batchSize) {
                const placeholders = historicalBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
                const flatValues = historicalBatch.flat()
                const flushedCount = historicalBatch.length
                await fastify.mariadb.query(
                    `
                    INSERT INTO historical_vessel_positions (
                        mmsi, vesselName, navigationalStatus, rateOfTurn, speedOverGround, courseOverGround, heading,
                        longitude, latitude, specialManoeuvre, communicationState, timestamp
                    ) VALUES ${placeholders}
                `,
                    flatValues
                )
                historicalBatch.length = 0
                console.log(chalk.green(`Flushed ${flushedCount} historical positions to database`))
            }

            // Update current position in DB and cache AFTER history logic
            await fastify.mariadb.query(
                `
                INSERT INTO current_vessel_positions (
                    mmsi, vesselName, navigationalStatus, rateOfTurn, speedOverGround, courseOverGround, heading,
                    longitude, latitude, specialManoeuvre, communicationState, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    vesselName = VALUES(vesselName),
                    navigationalStatus = VALUES(navigationalStatus),
                    rateOfTurn = VALUES(rateOfTurn),
                    speedOverGround = VALUES(speedOverGround),
                    courseOverGround = VALUES(courseOverGround),
                    heading = VALUES(heading),
                    longitude = VALUES(longitude),
                    latitude = VALUES(latitude),
                    specialManoeuvre = VALUES(specialManoeuvre),
                    communicationState = VALUES(communicationState),
                    timestamp = VALUES(timestamp)
            `,
                [
                    mmsi,
                    vesselName,
                    navigationalStatus,
                    rateOfTurn,
                    speedOverGround,
                    courseOverGround,
                    heading,
                    longitude,
                    latitude,
                    specialManoeuvre,
                    communicationState,
                    timestamp,
                ]
            )

            lastPositionsCache.set(mmsiNumber, {
                position: {
                    mmsi: mmsi,
                    vesselName,
                    navigationalStatus,
                    rateOfTurn,
                    speedOverGround,
                    courseOverGround,
                    heading,
                    longitude,
                    latitude,
                    specialManoeuvre,
                    communicationState,
                    timestamp,
                },
                lastUpdated: Date.now(),
            })
        
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
