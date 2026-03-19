import { EquasisScraper } from './sites/equasis.org.js'
import { DnvScraper } from './sites/dnv.js'

export async function startScraping() {
    const equasis = new EquasisScraper(process.env.EQUASIS_USERNAME!, process.env.EQUASIS_PASSWORD!)
    const dnv = new DnvScraper()

    await equasis.login()
}