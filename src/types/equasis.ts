export type VesselBasicInfo = {
    imo: string
    name: string
    flag: string
    flag_code?: string
    call_sign?: string
    mmsi?: string
    gross_tonnage?: number
    dwt?: number
    vessel_type?: string
    year_built?: number
    status?: string
    status_date?: string
    last_update?: string
}

export type CompanyInfo = {
    imo?: string
    name: string
    role: string
    address?: string
    date_effect?: string
}

export type ClassificationInfo = {
    society: string
    status: string
    date_effect?: string
}

export type InspectionInfo = {
    authority?: string
    port?: string
    date: string
    detention: string
    psc_organization: string
    inspection_type?: string
    duration?: string
    deficiencies?: string
    inspection_id?: string
}

export type HistoricalName = {
    name: string
    date_effect: string
    source: string
}

export type HistoricalFlag = {
    flag: string
    date_effect: string
    source: string
}

export type HistoricalCompany = {
    company: string
    role: string
    date_effect: string
    source: string
}

export type EquasisVesselData = {
    basic_info: VesselBasicInfo
    
    management: CompanyInfo[]
    classification: ClassificationInfo[]
    inspections: InspectionInfo[]

    historical_names: HistoricalName[]
    historical_flags: HistoricalFlag[]
    historical_companies: HistoricalCompany[]
}