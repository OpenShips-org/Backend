import axios, { type AxiosInstance } from 'axios'
import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'
import * as cheerio from 'cheerio'
import chalk from 'chalk'
import { URLSearchParams } from 'node:url'
import type {
    ClassificationInfo,
    CompanyInfo,
    EquasisVesselData,
    HistoricalCompany,
    HistoricalFlag,
    HistoricalName,
    InspectionInfo,
    VesselBasicInfo,
} from '../../../types/equasis.js'

type EquasisTab = 'ship_info' | 'inspections' | 'ship_history'

//#region Scraper
export class EquasisScraper {
    private readonly baseUrl = 'https://www.equasis.org'
    private readonly username: string
    private readonly password: string

    private readonly cookies: CookieJar
    private readonly axiosInstance: AxiosInstance
    private readonly parser: EquasisParser = new EquasisParser()

    private loggedIn = false

    constructor(username: string, password: string) {
        this.username = username
        this.password = password

        this.cookies = new CookieJar()

        const instance = axios.create({
            baseURL: this.baseUrl,
            jar: this.cookies as any,
            withCredentials: true,
            maxRedirects: 10,
            timeout: 30_000,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                Connection: 'keep-alive',
            },
        })

        this.axiosInstance = wrapper(instance)
    }

    async login(): Promise<boolean> {
        try {
            const loginUrl = `${this.baseUrl}/EquasisWeb/authen/HomePage?fs=HomePage`
            const response = await this.axiosInstance.get(loginUrl)
            const $ = cheerio.load(response.data)

            const form = $('form[name="formLogin"]').first()
            const action = form.attr('action') ?? loginUrl
            const postUrl = new URL(action, loginUrl).href

            const params = new URLSearchParams()
            params.append('j_email', this.username)
            params.append('j_password', this.password)
            params.append('submit', 'Ok')

            await this.axiosInstance.post(postUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            })

            const subResponse = await this.axiosInstance.get(
                '/EquasisWeb/restricted/ShipSubcription?fs=HomePage'
            )

            if (this.isLoginPage(subResponse.data)) {
                console.log(
                    chalk.red(
                        '[SCRAPER - EQUASIS] Login failed: Invalid credentials or unexpected response'
                    )
                )
                return false
            }

            this.loggedIn = true
            console.log(chalk.green('[SCRAPER - EQUASIS] Login successful'))
            return true
        } catch (error) {
            console.error(chalk.red(`[SCRAPER - EQUASIS] Error during login: ${error}`))
            return false
        }
    }

    async getDataByImo(imo: string): Promise<EquasisVesselData | null> {
        if (!this.loggedIn && !(await this.login())) {
            console.log(
                chalk.yellow('[SCRAPER - EQUASIS] Not logged in, cannot fetch data')
            )
            return null
        }

        try {
            const tabUrls: Record<EquasisTab, string> = {
                ship_info: `${this.baseUrl}/EquasisWeb/restricted/ShipInfo?fs=ShipInfo&P_IMO=${imo}`,
                inspections: `${this.baseUrl}/EquasisWeb/restricted/ShipInspection?fs=ShipInfo&P_IMO=${imo}`,
                ship_history: `${this.baseUrl}/EquasisWeb/restricted/ShipHistory?fs=ShipInfo&P_IMO=${imo}`,
            }

            let vesselData: EquasisVesselData | null = null

            for (const [tab, url] of Object.entries(tabUrls) as [EquasisTab, string][]) {
                try {
                    const response = await this.axiosInstance.get(url)
                    await this.sleep(1000)

                    const tabData = this.parser.parseHtml(response.data, tab)
                    if (!tabData) {
                        console.log(
                            chalk.yellow(
                                `[SCRAPER - EQUASIS] No data found for IMO ${imo} in tab ${tab}`
                            )
                        )
                        continue
                    }

                    if (!vesselData) {
                        vesselData = tabData
                    } else {
                        this.mergeVesselData(vesselData, tabData, tab)
                    }
                } catch (error) {
                    console.error(
                        chalk.red(
                            `[SCRAPER - EQUASIS] Error fetching tab ${tab} for IMO ${imo}: ${error}`
                        )
                    )
                }
            }

            return vesselData
        } catch (error) {
            console.error(
                chalk.red(`[SCRAPER - EQUASIS] Error fetching data for IMO ${imo}: ${error}`)
            )
            return null
        }
    }

    private mergeVesselData(
        baseData: EquasisVesselData,
        newData: EquasisVesselData,
        tab: EquasisTab
    ) {
        if (tab === 'inspections') {
            baseData.inspections = newData.inspections
            return
        }

        if (tab === 'ship_history') {
            baseData.historical_names = newData.historical_names
            baseData.historical_flags = newData.historical_flags
            baseData.historical_companies = newData.historical_companies
            return
        }

        if (tab === 'ship_info') {
            baseData.management = newData.management
            baseData.classification = newData.classification
        }
    }

    private isLoginPage(html: string): boolean {
        return html.includes('formLogin') || html.includes('j_email') || html.includes('j_password')
    }

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms))
 
   }

   async isInDnvRegister(imo: string): Promise<boolean> {
        try {
            const data = await this.getDataByImo(imo)
            if (!data) {
                console.log(chalk.yellow(`[SCRAPER - EQUASIS] No data found for IMO ${imo}, cannot determine DNV register status`))
                return false
            }

            const isClassifiedByDnv = data.classification.some(c => c.society.toLowerCase().includes('dnv'))
            if (isClassifiedByDnv) {
                return true
            } else {
                return false
            }
        } catch (error) {
            console.error(chalk.red(`[SCRAPER - EQUASIS] Error checking DNV register status for IMO ${imo}: ${error}`))
            return false
        }
    }
}

//#endregion

//#region Parser

class EquasisParser {
    parseHtml(html: string, tab: EquasisTab): EquasisVesselData | null {
        const $ = cheerio.load(html)
        const basicInfo = this.parseBasicInfo($)

        if (!basicInfo) {
            return null
        }

        const vesselData: EquasisVesselData = {
            basic_info: basicInfo,
            management: [],
            classification: [],
            inspections: [],
            historical_names: [],
            historical_flags: [],
            historical_companies: [],
        }

        if (tab === 'ship_info') {
            vesselData.management = this.parseManagement($)
            vesselData.classification = this.parseClassification($)
        } else if (tab === 'inspections') {
            vesselData.inspections = this.parseInspections($)
        } else if (tab === 'ship_history') {
            vesselData.historical_names = this.parseHistoricalNames($)
            vesselData.historical_flags = this.parseHistoricalFlags($)
            vesselData.historical_companies = this.parseHistoricalCompanies($)
        }

        return vesselData
    }

    private parseBasicInfo($: cheerio.CheerioAPI): VesselBasicInfo | null {
        const data: Partial<VesselBasicInfo> = {}

        const h4 = $('h4.color-gris-bleu-copyright').first()
        if (h4.length > 0) {
            const nameTag = h4.find('b').first()
            if (nameTag.length > 0) {
                data.name = this.cleanText(nameTag.text())
            }

            const imoMatch = h4.text().match(/IMO[^0-9]*(\d{7})/i)
            if (imoMatch) {
                const imo = imoMatch[1]
                if (imo) {
                    data.imo = imo
                }
            }
        }

        $('div.row').each((_, row) => {
            const columns = $(row).find('div[class*="col-"]')
            if (columns.length < 2) {
                return
            }

            const label = this.cleanText($(columns.get(0)).text()).toLowerCase()
            const value = this.cleanText($(columns.get(1)).text())
            const thirdColumn = columns.length > 2 ? this.cleanText($(columns.get(2)).text()) : ''

            if (!label || !value) {
                return
            }

            if (label.includes('flag')) {
                if (!data.flag) {
                    data.flag = value
                }

                const imageSource = $(columns.get(1)).find('img').first().attr('src')
                const flagMatch = imageSource?.match(/\/flags\/([A-Z]+)\./)
                if (flagMatch?.[1]) {
                    data.flag_code = flagMatch[1]
                }

                const countryMatch = thirdColumn.match(/^\((.+)\)$/)
                if (countryMatch?.[1]) {
                    data.flag = countryMatch[1]
                }
            } else if (label.includes('call sign')) {
                data.call_sign = value
            } else if (label.includes('mmsi')) {
                data.mmsi = value
            } else if (label.includes('gross tonnage')) {
                const grossTonnage = this.toOptionalNumber(value)
                if (grossTonnage !== undefined) {
                    data.gross_tonnage = grossTonnage
                }
            } else if (label.includes('dwt')) {
                const dwt = this.toOptionalNumber(value)
                if (dwt !== undefined) {
                    data.dwt = dwt
                }
            } else if (label.includes('type of ship')) {
                data.vessel_type = value
            } else if (label.includes('year of build') || label.includes('year built')) {
                const yearBuilt = this.toOptionalNumber(value)
                if (yearBuilt !== undefined) {
                    data.year_built = yearBuilt
                }
            } else if (label === 'status') {
                data.status = value
                const statusDateMatch = thirdColumn.match(/(since|during).+/i)
                if (statusDateMatch?.[0]) {
                    data.status_date = statusDateMatch[0]
                }
            }
        })

        const updateBadge = $('p.badge.gris-bleu-copyright.badge-notification').first()
        if (updateBadge.length > 0) {
            const dateMatch = updateBadge.text().match(/(\d{2}\/\d{2}\/\d{4})/)
            if (dateMatch?.[1]) {
                data.last_update = dateMatch[1]
            }
        }

        if (!data.name || !data.imo) {
            return null
        }

        const basicInfo: VesselBasicInfo = {
            imo: data.imo,
            name: data.name,
            flag: data.flag ?? '',
        }

        if (data.flag_code) {
            basicInfo.flag_code = data.flag_code
        }
        if (data.call_sign) {
            basicInfo.call_sign = data.call_sign
        }
        if (data.mmsi) {
            basicInfo.mmsi = data.mmsi
        }
        if (data.gross_tonnage !== undefined) {
            basicInfo.gross_tonnage = data.gross_tonnage
        }
        if (data.dwt !== undefined) {
            basicInfo.dwt = data.dwt
        }
        if (data.vessel_type) {
            basicInfo.vessel_type = data.vessel_type
        }
        if (data.year_built !== undefined) {
            basicInfo.year_built = data.year_built
        }
        if (data.status) {
            basicInfo.status = data.status
        }
        if (data.status_date) {
            basicInfo.status_date = data.status_date
        }
        if (data.last_update) {
            basicInfo.last_update = data.last_update
        }

        return basicInfo
    }

    private parseManagement($: cheerio.CheerioAPI): CompanyInfo[] {
        const companies: CompanyInfo[] = []

        $('div#collapse3 table.tableLS tbody tr').each((_, row) => {
            const cells = $(row).find('td')
            if (cells.length < 5) {
                return
            }

            const imo = this.emptyToUndefined(this.cleanText($(cells.get(0)).text()))
            const address = this.emptyToUndefined(this.cleanText($(cells.get(3)).text()))
            const dateEffect = this.emptyToUndefined(this.cleanText($(cells.get(4)).text()))

            companies.push({
                ...(imo ? { imo } : {}),
                role: this.cleanText($(cells.get(1)).text()),
                name: this.cleanText($(cells.get(2)).text()),
                ...(address ? { address } : {}),
                ...(dateEffect ? { date_effect: dateEffect } : {}),
            })
        })

        return companies
    }

    private parseClassification($: cheerio.CheerioAPI): ClassificationInfo[] {
        const classifications: ClassificationInfo[] = []

        $('div#collapse4 div.access-body').each((_, item) => {
            const society = this.cleanText($(item).find('p').first().text())
            if (!society) {
                return
            }

            const status = this.cleanText($(item).find('span.badge').first().text())
            const dateEffect = $(item)
                .find('p')
                .toArray()
                .map(element => this.cleanText($(element).text()))
                .find(text => /since|during/i.test(text))

            classifications.push({
                society,
                status,
                ...(dateEffect ? { date_effect: dateEffect } : {}),
            })
        })

        return classifications
    }

    private parseInspections($: cheerio.CheerioAPI): InspectionInfo[] {
        const inspections: InspectionInfo[] = []

        $('div#collapse1DD, div.tableLSDD').each((_, section) => {
            $(section)
                .find('table.tableLSDD tbody tr, table.table tbody tr')
                .each((__, row) => {
                    const cells = $(row).find('td')
                    if (cells.length < 5) {
                        return
                    }

                    const onclick = this.findOnclick($(row))
                    const inspectionId = onclick?.match(/P_INSP\.value='(\d+)'/)?.[1]
                    const authority = this.emptyToUndefined(this.cleanText($(cells.get(0)).text()))
                    const port = this.emptyToUndefined(this.cleanText($(cells.get(1)).text()))
                    const inspectionType = this.emptyToUndefined(this.cleanText($(cells.get(5)).text()))
                    const duration = this.emptyToUndefined(this.cleanText($(cells.get(6)).text()))
                    const deficiencies = this.emptyToUndefined(this.cleanText($(cells.get(7)).text()))

                    inspections.push({
                        ...(authority ? { authority } : {}),
                        ...(port ? { port } : {}),
                        date: this.cleanText($(cells.get(2)).text()),
                        detention: this.cleanText($(cells.get(3)).text()),
                        psc_organization: this.cleanText($(cells.get(4)).text()),
                        ...(inspectionType ? { inspection_type: inspectionType } : {}),
                        ...(duration ? { duration } : {}),
                        ...(deficiencies ? { deficiencies } : {}),
                        ...(inspectionId ? { inspection_id: inspectionId } : {}),
                    })
                })
        })

        return inspections
    }

    private parseHistoricalNames($: cheerio.CheerioAPI): HistoricalName[] {
        const names: HistoricalName[] = []

        $('div#collapse1 table.tableLS tbody tr').each((_, row) => {
            const cells = $(row).find('td')
            if (cells.length < 3) {
                return
            }

            names.push({
                name: this.cleanText($(cells.get(0)).text()),
                date_effect: this.cleanText($(cells.get(1)).text()),
                source: this.cleanText($(cells.get(2)).text()),
            })
        })

        return names
    }

    private parseHistoricalFlags($: cheerio.CheerioAPI): HistoricalFlag[] {
        const flags: HistoricalFlag[] = []

        $('div#collapse2 table.tableLS tbody tr').each((_, row) => {
            const cells = $(row).find('td')
            if (cells.length < 3) {
                return
            }

            flags.push({
                flag: this.cleanText($(cells.get(0)).text()),
                date_effect: this.cleanText($(cells.get(1)).text()),
                source: this.cleanText($(cells.get(2)).text()),
            })
        })

        return flags
    }

    private parseHistoricalCompanies($: cheerio.CheerioAPI): HistoricalCompany[] {
        const companies: HistoricalCompany[] = []

        $('div#collapse4 table.tableLS tbody tr').each((_, row) => {
            const cells = $(row).find('td')
            if (cells.length < 4) {
                return
            }

            companies.push({
                company: this.cleanText($(cells.get(0)).text()),
                role: this.cleanText($(cells.get(1)).text()),
                date_effect: this.cleanText($(cells.get(2)).text()),
                source: this.cleanText($(cells.get(3)).text()),
            })
        })

        return companies
    }

    private findOnclick(row: any): string | undefined {
        return row.attr('onclick') ?? row.find('a[onclick]').first().attr('onclick')
    }

    private isEmpty(value: string | undefined | null): boolean {
        return !value || value.trim().length === 0
    }

    private cleanText(value: string | undefined | null): string {
        return value?.replace(/\s+/g, ' ').trim() ?? ''
    }

    private emptyToUndefined(value: string): string | undefined {
        return this.isEmpty(value) ? undefined : value
    }

    private toOptionalNumber(value: string): number | undefined {
        const normalized = value.replace(/[^0-9.,-]/g, '').replace(',', '.')
        if (!normalized) {
            return undefined
        }

        const parsed = Number(normalized)
        return Number.isFinite(parsed) ? parsed : undefined
    }
}

//#endregion