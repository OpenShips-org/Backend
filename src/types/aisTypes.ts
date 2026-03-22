export type VesselPosition = {
    mmsi: string
    vesselName: string | null
    navigationalStatus: number | null
    rateOfTurn: number | null
    speedOverGround: number | null
    courseOverGround: number | null
    heading: number | null
    longitude: number | null
    latitude: number | null
    specialManoeuvre: number | null
    communicationState: number | null
    timestamp: string | null
}

export type BaseStationPosition = {
    mmsi: string
    longitude: number | null
    latitude: number | null
    longRangeEnabled: boolean | null
    communicationState: number | null
    timestamp: string | null
}

export type StandardVesselInfo = {
    mmsi: string,
    imo: string,
    callSign: string,
    shipName: string,
    destination: string,
    shipType: number,
    maxDraught: number,
    dimensionA: number,
    dimensionB: number,
    dimensionC: number,
    dimensionD: number,
    eta: string | null,
    timestamp: string
}