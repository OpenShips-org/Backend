import axios, { type AxiosInstance } from 'axios'
import chalk from 'chalk'
import type { DnvData } from '../../../types/dnv.js'


export class DnvScraper {
    private axios: AxiosInstance
    
    constructor() {
        this.axios = axios.create({
            baseURL: 'https://vesselregister.dnv.com/vesselregister',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })
    }

    async getDataByImo(imo: string) : Promise<DnvData | null> {
        let dnvNumber = null
        
        try {
            const response = await this.axios.get(`/vessel/get?term=${imo}`)
            const data = response.data

            if (response.status === 404) {
                console.log(chalk.red(`No vessel found for IMO ${imo}`))
                return null
            } else if (response.status !== 200) {
                console.log(chalk.red(`Error fetching data for IMO ${imo}: ${response.statusText}`))
                return null
            }

            dnvNumber = data?.vessels[0]?.id;
        } catch (error) {
            console.log(chalk.red(`Error fetching data for IMO ${imo}: ${error}`))
            return null
        }

        if (!dnvNumber) {
            console.log(chalk.red(`No DNV number found for IMO ${imo}`))
            return null
        }

        try {
            const response = await this.axios.get(`/vesseldetails?vesselId=${dnvNumber}`)
            const data = response.data as DnvData

            if (response.status !== 200) {
                console.log(chalk.red(`Error fetching vessel details for DNV number ${dnvNumber}: ${response.statusText}`))
                return null
            }

            return data
        } catch (error) {
            console.log(chalk.red(`Error fetching vessel details for DNV number ${dnvNumber}: ${error}`))
            return null
        }
    }

    async isInDNV(imo: string) : Promise<boolean> {
        try {
            const response = await this.axios.get(`/vessel/get?term=${imo}`)
            const data = response.data

            if (response.status === 404) {
                return false
            } else if (response.status !== 200) {
                console.log(chalk.red(`Error checking DNV for IMO ${imo}: ${response.statusText}`))
                return false
            }

            return data?.vessels?.length > 0
        } catch (error) {
            console.log(chalk.red(`Error checking DNV for IMO ${imo}: ${error}`))
            return false
        }
    }
}