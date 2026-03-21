import { EquasisScraper } from './sites/equasis.org.js'
import { DnvScraper } from './sites/dnv.js'

import type { VesselData } from '../../types/scraperTypes.js'
import type { FastifyInstance } from 'fastify'
import chalk from 'chalk'

export class Scraper {
	private equasisScraper: EquasisScraper
	private dnvScraper: DnvScraper
	private fastify: FastifyInstance

	constructor(fastify: FastifyInstance) {
		if (!process.env.EQUASIS_USERNAME || !process.env.EQUASIS_PASSWORD) {
			throw new Error('EQUASIS_USERNAME and EQUASIS_PASSWORD environment variables must be set')
		}

		this.equasisScraper = new EquasisScraper(process.env.EQUASIS_USERNAME!, process.env.EQUASIS_PASSWORD!)
		this.dnvScraper = new DnvScraper()
		this.fastify = fastify

		setInterval(() => {
			this.updateOldVessels().catch(error => console.error(chalk.red('Error updating old vessels:'), error))
		}, 10 * 60 * 1000);
	}

	async getVesselData(imo: number): Promise<VesselData> {
		// Check if the vessel is already being scraped
		let result = await this.getFromDB(imo)
		if (result) {
			return result
		}

		// If not, scrape it and store in DB
		
		//#region Equasis scraping
		let equasisData

		try {
			equasisData = await this.equasisScraper.getDataByImo(String(imo))
		} catch (error) {
			console.error(`Error scraping Equasis for IMO ${imo}:`, error)
		}
		//#endregion

		//#region DNV scraping
		let dnvData

		try {
			dnvData = await this.dnvScraper.getDataByImo(String(imo))
		} catch (error) {
			console.error(`Error scraping DNV for IMO ${imo}:`, error)
		}
		//#endregion

		//#region Data transformation and DB insertion
		const vesselData: VesselData = {
			imoNumber: imo,
			mmsiNumber: Number(equasisData?.basic_info?.mmsi) || null,
			vesselName: equasisData?.basic_info?.name || null,
			flag: equasisData?.basic_info?.flag || null,
			callSign: equasisData?.basic_info?.call_sign || null,
			vesselType: equasisData?.basic_info?.vessel_type || null,
			grossTonnage: Number(equasisData?.basic_info?.gross_tonnage) || null,
			dwt: Number(equasisData?.basic_info?.dwt) || null,
			yearBuilt: Number(equasisData?.basic_info?.year_built) || null,
			status: equasisData?.basic_info?.status || null,
			statusDate: equasisData?.basic_info?.status_date ? new Date(equasisData.basic_info.status_date) : null,
			hasDnvEntry: !!dnvData,
			hasEquasisEntry: !!equasisData,
			dnvData,
			equasisData
		}

		await this.pushToDB(vesselData)
		//#endregion

		return vesselData
	}

	private async pushToDB(data: VesselData) {

		//#region Data transformation
		const imoNumber = data.imoNumber
		const mmsiNumber = data.mmsiNumber
		const vesselName = data.vesselName
		const flag = data.flag
		const callSign = data.callSign
		const vesselType = data.vesselType
		const grossTonnage = data.grossTonnage
		const dwt = data.dwt
		const yearBuilt = data.yearBuilt
		const status = data.status
		const statusDate = data.statusDate
		const lastUpdate = data.lastUpdate

		const hasDnvEntry = data.hasDnvEntry
		const hasEquasisEntry = data.hasEquasisEntry

		const dnvData = data.dnvData
		const equasisData = data.equasisData
		//#endregion

		//#region DB insertion logic
		const result = await this.fastify.mariadb.query(
			`INSERT INTO vessels (imo_number, mmsi_number, vessel_name, flag, call_sign, vessel_type, gross_tonnage, dwt, year_built, status, status_date, last_update, has_dnv_entry, has_equasis_entry, dnv_data, equasis_data, last_scraped)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
					mmsi_number = VALUES(mmsi_number),
					vessel_name = VALUES(vessel_name),
					flag = VALUES(flag),
					call_sign = VALUES(call_sign),
					vessel_type = VALUES(vessel_type),
					gross_tonnage = VALUES(gross_tonnage),
					dwt = VALUES(dwt),
					year_built = VALUES(year_built),
					status = VALUES(status),
					status_date = VALUES(status_date),
					last_update = VALUES(last_update),
					has_dnv_entry = VALUES(has_dnv_entry),
					has_equasis_entry = VALUES(has_equasis_entry),
					dnv_data = VALUES(dnv_data),
					equasis_data = VALUES(equasis_data),
					last_scraped = NOW()
			`,
			[
				imoNumber,
				mmsiNumber,
				vesselName,
				flag,
				callSign,
				vesselType,
				grossTonnage,
				dwt,
				yearBuilt,
				status,
				statusDate ? statusDate.toISOString().split('T')[0] : null,
				lastUpdate ?? null,
				hasDnvEntry,
				hasEquasisEntry,
				dnvData ? JSON.stringify(dnvData) : null,
				equasisData ? JSON.stringify(equasisData) : null
			]
		)

		return result
		//#endregion
	}

	private async getFromDB(imo: number): Promise<VesselData | null> {
		const [rows] = await this.fastify.mariadb.query(
			`SELECT * FROM vessels WHERE imo_number = ?`,
			[imo]
		)

		if (rows.length === 0) {
			return null
		}

		const row = rows[0]

		const vesselData: VesselData = {
			imoNumber: row.imo_number,
			mmsiNumber: row.mmsi_number,
			vesselName: row.vessel_name,
			flag: row.flag,
			callSign: row.call_sign,
			vesselType: row.vessel_type,
			grossTonnage: row.gross_tonnage,
			dwt: row.dwt,
			yearBuilt: row.year_built,
			status: row.status,
			hasDnvEntry: !!row.has_dnv_entry,
			hasEquasisEntry: !!row.has_equasis_entry
		}

		if (row.status_date) {
			vesselData.statusDate = new Date(row.status_date)
		}

		if (row.last_update) {
			vesselData.lastUpdate = new Date(row.last_update)
		}

		if (row.dnv_data) {
			vesselData.dnvData = JSON.parse(row.dnv_data)
		}

		if (row.equasis_data) {
			vesselData.equasisData = JSON.parse(row.equasis_data)
		}

		return vesselData
	}

	private async updateOldVessels() {
		
		const sevenDaysAgo = new Date((Date.now() - 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
		
		const [rows] = await this.fastify.mariadb.query(
			`SELECT imo_number FROM vessels WHERE last_scraped < ?`,
			[sevenDaysAgo]
		)
		const imoNumbers = rows.map((row: any) => row.imo_number)

		for (const imo of imoNumbers) {
			try {
				await this.getVesselData(imo)
			} catch (error) {
				console.error(chalk.red(`Error updating vessel with IMO ${imo}:`), error)
			}
			// Add a small delay between requests to avoid overwhelming the scrapers
			await new Promise(resolve => setTimeout(resolve, 1000))
		}
	}

	
}