export type PositionBoxQuery = {
    minLat: number
    maxLat: number
    minLon: number
    maxLon: number
    limit?: number
}

export type MMSIParam = {
    mmsi: number
}

export type HistoryQuery = {
    limit?: number
    startTime?: string
    endTime?: string
    order?: 'asc' | 'desc'
}

export type VesselStaticInfoQuery = {
    scrapedData?: boolean
}