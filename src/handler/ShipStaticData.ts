import { parseAisStreamTimestamp, parseDateForDatabase } from '../utils/timeUtility.js'
import type { FastifyInstance } from 'fastify'
import chalk from 'chalk';

export async function handleShipStaticDataMessage(
    msg: any,
    fastify: FastifyInstance
) {
    try {
        const metaData = msg.MetaData
        const shipStaticData = msg.Message.ShipStaticData

        //#region Validation
        if (!shipStaticData.Valid) {
            console.info(
                chalk.red(`Received invalid static ship data for MMSI ${metaData.MMSI}, skipping database update.`)
            )
            return
        }
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
        const imo = shipStaticData.ImoNumber
        const callSign = shipStaticData.CallSign ?? null
        const shipName = shipStaticData.Name ?? null
        const destination = shipStaticData.Destination ?? null
        const shipType = shipStaticData.Type ?? null
        const maxDraught = shipStaticData.MaximumStaticDraught ?? null
        const dimensionA = shipStaticData.Dimension.A ?? null
        const dimensionB = shipStaticData.Dimension.B ?? null
        const dimensionC = shipStaticData.Dimension.C ?? null
        const dimensionD = shipStaticData.Dimension.D ?? null
        //#endregion

        //#region ETA validation and formatting
        const etaData = shipStaticData.Eta
        let finalEta: string | null = null

        if (!etaData) {
            //console.warn(chalk.yellow(
            //    `Received static ship data for MMSI ${metaData.MMSI} without ETA.`
            //))
        } else if (
            etaData.Month === 0 ||
            etaData.Day === 0 ||
            etaData.Hour === 24 ||
            etaData.Minute === 60
        ) {
            //console.warn(chalk.yellow(
            //   `Received static ship data for MMSI ${metaData.MMSI} with invalid ETA components (Month: ${etaData.Month}, Day: ${etaData.Day}, Hour: ${etaData.Hour}, Minute: ${etaData.Minute}). Setting ETA to null.`
            //))
        } else {
            const now = new Date()
            let year = now.getUTCFullYear()

            if (etaData.Month < now.getUTCMonth() + 1) {
                year += 1
            }

            finalEta = parseDateForDatabase(
                new Date(
                    Date.UTC(
                        year,
                        etaData.Month - 1,
                        etaData.Day,
                        etaData.Hour,
                        etaData.Minute
                    )
                )
            )
        }
        //#endregion

        //#region Database update
        const result = await fastify.mariadb.query(
            'INSERT INTO static_ship_data (mmsi, imo, call_sign, ship_name, destination, ship_type, max_draught, dimensionA, dimensionB, dimensionC, dimensionD, eta, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE imo = VALUES(imo), call_sign = VALUES(call_sign), ship_name = VALUES(ship_name), destination = VALUES(destination), ship_type = VALUES(ship_type), max_draught = VALUES(max_draught), dimensionA = VALUES(dimensionA), dimensionB = VALUES(dimensionB), dimensionC = VALUES(dimensionC), dimensionD = VALUES(dimensionD), eta = VALUES(eta), timestamp = VALUES(timestamp)',
            [
                mmsi,
                imo,
                callSign,
                shipName,
                destination,
                shipType,
                maxDraught,
                dimensionA,
                dimensionB,
                dimensionC,
                dimensionD,
                finalEta,
                timestamp
            ]
        )

        if (result.affectedRows === 1) {
            //console.log(chalk.yellow(
            //    `Inserted static ship data for MMSI ${mmsi} into static_ship_data.`
            //))
        } else if (result.affectedRows === 2) {
            //console.log(chalk.yellow(
            //    `Updated static ship data for MMSI ${mmsi} in static_ship_data.`
            //))
        } else {
            console.warn(chalk.red(
                `Unexpected result when inserting/updating static ship data for MMSI ${mmsi}: affectedRows = ${result.affectedRows}`
            ))
        }
        //#endregion
    } catch (err) {
        console.error(chalk.red(`Error processing static ship data message: ${err}`))
    }
}
