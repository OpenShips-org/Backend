export type VesselPosition = {
    mmsi: string
    ship_name: string | null
    navigation_status: number | null
    rot: number | null
    sog: number | null
    cog: number | null
    true_heading: number | null
    longitude: number | null
    latitude: number | null
    special_manoeuvre: number | null
    communication_state: number | null
    timestamp: string | null
}
