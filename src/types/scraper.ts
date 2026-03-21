import type { Certificate, Classification, Condition, Dimensions, Hull, Identification, Machinery, Owner, Survey, Yard } from "./dnv.js";
import type { ClassificationInfo, CompanyInfo, HistoricalCompany, HistoricalFlag, HistoricalName, InspectionInfo, VesselBasicInfo } from "./equasis.js";

export type VesselData = {
    imoNumber: number,
    mmsiNumber?: number | null,
    vesselName?: string | null,
    flag?: string | null,
    callSign?: string | null,
    vesselType?: string | null,
    grossTonnage?: number | null,
    dwt?: number | null,
    yearBuilt?: number | null,
    status?: string | null,
    statusDate?: Date | null,
    lastUpdate?: Date | null,
    hasDnvEntry: boolean,
    hasEquasisEntry: boolean,

    dnvData?: {
        identification?: Identification | null,
        owner?: Owner | null,
        classification?: Classification | null,
        certificates?: Certificate[] | null,
        surveys?: Survey[] | null,
        conditions?: Condition[] | null,
        yard?: Yard | null,
        dimensions?: Dimensions | null,
        hull?: Hull | null,
        machinery?: Machinery | null,
    } | null | undefined,

    equasisData?: { 
        basicInfo?: VesselBasicInfo | null,
            
        management?: CompanyInfo[] | null,
        classification?: ClassificationInfo[] | null,
        inspections?: InspectionInfo[] | null,
        
        historicalNames?: HistoricalName[] | null,
        historicalFlags?: HistoricalFlag[] | null,
        historicalCompanies?: HistoricalCompany[] | null
    } | null | undefined
}

