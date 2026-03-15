import { parseDateForDatabase } from '../utils/timeUtility.js'
import type { FastifyInstance } from 'fastify'

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
                `Received invalid static ship data for MMSI ${metaData.MMSI}, skipping database update.`
            )
            return
        }
        //#endregion

        //#region Data sorting
        const mmsi = metaData.MMSI
        const imo = shipStaticData.ImoNumber
        const callSign = shipStaticData.CallSign
        const shipName = shipStaticData.Name
        const destination = shipStaticData.Destination
        const shipType = shipStaticData.ShipType
        const maxDraught = shipStaticData.MaxStaticDraught
        const dimensionA = shipStaticData.Dimension.A
        const dimensionB = shipStaticData.Dimension.B
        const dimensionC = shipStaticData.Dimension.C
        const dimensionD = shipStaticData.Dimension.D
        //#endregion

        //#region ETA validation and formatting
        const etaData = shipStaticData.ETA
        let finalEta: string | null = null

        if (!etaData) {
            console.warn(
                `Received static ship data for MMSI ${metaData.MMSI} without ETA.`
            )
        } else if (
            etaData.Month === 0 ||
            etaData.Day === 0 ||
            etaData.Hour === 24 ||
            etaData.Minute === 60
        ) {
            console.warn(
                `Received static ship data for MMSI ${metaData.MMSI} with invalid ETA components (Month: ${etaData.Month}, Day: ${etaData.Day}, Hour: ${etaData.Hour}, Minute: ${etaData.Minute}). Setting ETA to null.`
            )
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
            'INSERT INTO static_ship_data (mmsi, imo, call_sign, ship_name, destination, ship_type, max_draught, dimensionA, dimensionB, dimensionC, dimensionD, eta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE imo = VALUES(imo), call_sign = VALUES(call_sign), ship_name = VALUES(ship_name), destination = VALUES(destination), ship_type = VALUES(ship_type), max_draught = VALUES(max_draught), dimensionA = VALUES(dimensionA), dimensionB = VALUES(dimensionB), dimensionC = VALUES(dimensionC), dimensionD = VALUES(dimensionD), eta = VALUES(eta)',
            [mmsi, imo, callSign, shipName, destination, shipType, maxDraught, dimensionA, dimensionB, dimensionC, dimensionD, finalEta]
        )

        if (result.affectedRows === 1) {
            console.log(
                `Inserted static ship data for MMSI ${mmsi} into static_ship_data.`
            )
        } else if (result.affectedRows === 2) {
            console.log(
                `Updated static ship data for MMSI ${mmsi} in static_ship_data.`
            )
        } else {
            console.warn(
                `Unexpected result when inserting/updating static ship data for MMSI ${mmsi}: affectedRows = ${result.affectedRows}`
            )
        }
        //#endregion

    } catch (err) {
        console.error(`Error processing static ship data message: ${err}`)
    }
}
