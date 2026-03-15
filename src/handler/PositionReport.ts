import type { FastifyInstance } from 'fastify'
import {
    parseAisStreamTimestamp,
    parseDateForDatabase,
} from '../utils/timeUtility.js'

export async function handlePositionReportMessage(
    msg: any,
    fastify: FastifyInstance
) {
    //#region Current position update
    try {
        const metaData = msg.MetaData
        const positionReport = msg.Message.PositionReport

        //#region Data validation
        if (!positionReport.Valid) {
            console.info(
                `Received invalid position report for MMSI ${metaData.MMSI}, skipping database update.`
            )
            return
        }

        let coordsValid = true
        if (
            typeof positionReport.Longitude !== 'number' ||
            typeof positionReport.Latitude !== 'number'
        ) {
            coordsValid = false
        } else if (
            positionReport.Longitude < -180 ||
            positionReport.Longitude > 180
        ) {
            coordsValid = false
        } else if (
            positionReport.Latitude < -90 ||
            positionReport.Latitude > 90
        ) {
            coordsValid = false
        }

        if (!coordsValid) {
            console.warn(
                `Received position report for MMSI ${metaData.MMSI} with invalid coordinates (Longitude: ${positionReport.Longitude}, Latitude: ${positionReport.Latitude}). Skipping database update.`
            )
            return
        }
        //#endregion

        //#region Timestamp validation
        let parsedTimestamp = parseAisStreamTimestamp(metaData.time_utc)

        try {
            const date = new Date(parsedTimestamp)

            if (isNaN(date.getTime())) {
                console.error(
                    `Invalid timestamp format received for MMSI ${metaData.MMSI}: ${parsedTimestamp}`
                )
                return
            }

            const now = new Date()
            const timeDifference = Math.abs(now.getTime() - date.getTime())
            const maxAllowedDifference = 5 * 60 * 1000

            if (timeDifference > maxAllowedDifference) {
                console.warn(
                    `Received position report for MMSI ${metaData.MMSI} with timestamp ${parsedTimestamp} which is more than 5 minutes old. Skipping database update.`
                )
                return
            }
        } catch (err) {
            console.error(
                `Error validating timestamp for MMSI ${metaData.MMSI}:`,
                err
            )
            return
        }
        //#endregion

        //#region Data sorting
        const mmsi = metaData.MMSI
        const shipName = metaData.ShipName
        const navigationStatus = positionReport.NavigationalStatus
        const rot = positionReport.RateOfTurn
        const sog = positionReport.Sog
        const cog = positionReport.Cog
        const trueHeading = positionReport.TrueHeading
        const longitude = positionReport.Longitude
        const latitude = positionReport.Latitude
        const specialManeuver = positionReport.SpecialManoeuvreIndicator
        const communicationState = positionReport.CommunicationState
        const timestamp = parseDateForDatabase(new Date(parsedTimestamp))

        if (!timestamp) {
            console.error(
                `Error formatting timestamp for MMSI ${metaData.MMSI}: ${parsedTimestamp}`
            )
            return
        }
        //#endregion

        //#region Database update
        const result = await fastify.mariadb.query(
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

        if (result.affectedRows === 1) {
            console.log(
                `Inserted new position report for MMSI ${mmsi} into current_vessel_positions.`
            )
        } else if (result.affectedRows === 2) {
            console.log(
                `Updated existing position report for MMSI ${mmsi} in current_vessel_positions.`
            )
        } else {
            console.warn(
                `Unexpected number of affected rows (${result.affectedRows}) when inserting/updating position report for MMSI ${mmsi}.`
            )
        }
        //#endregion
    } catch (err) {
        console.error(
            'Error processing position report while updating current position. Error message:',
            err
        )
    }
    //#endregion
}
