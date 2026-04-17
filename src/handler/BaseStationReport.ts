import { parseAisStreamTimestamp, parseDateForDatabase } from '../utils/dateUtility.js'
import type { FastifyInstance } from 'fastify'
import chalk from 'chalk';

export async function handleBaseStationReportMessage(
    msg: any,
    fastify: FastifyInstance
) {
    try {
        const metaData = msg.MetaData;
        const baseStationReport = msg.Message.BaseStationReport;

        //#region Validation
        if (!metaData || !baseStationReport) {
            console.warn(chalk.yellow('Received Base Station Report message with missing MetaData or BaseStationReport. Skipping message.'));
            return;
        }

        if (!baseStationReport.Valid) {
            console.warn(chalk.yellow('Received invalid Base Station Report message. Skipping message.'));
            return;
        }
        //#endregion

        //#region Timestamp
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
        const mmsi = metaData.MMSI;
        const latitude = baseStationReport.Latitude;
        const longitude = baseStationReport.Longitude;
        const longRangeEnabled = baseStationReport.LongRangeEnable;
        const communicationState = baseStationReport.CommunicationState;
        //#endregion

        //#region Database update
        const result = await fastify.mariadb.query(`
            INSERT INTO base_stations (mmsi, latitude, longitude, longRangeEnabled, communicationState, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                latitude = VALUES(latitude),
                longitude = VALUES(longitude),
                longRangeEnabled = VALUES(longRangeEnabled),
                communicationState = VALUES(communicationState),
                timestamp = VALUES(timestamp)
        `, [mmsi, latitude, longitude, longRangeEnabled, communicationState, timestamp])
        //#endregion

    } catch (err) {
        console.error(chalk.red('Error processing Base Station Report message:'), err);
    }
}