import type { PositionBoxQuery } from "./types.js";

export async function validateBoxParameters(
    query: PositionBoxQuery
): Promise<{ valid: boolean; message?: string }> {
    const { minLat, maxLat, minLon, maxLon, limit } = query

    if (minLat >= maxLat) {
        return { valid: false, message: 'minLat must be less than maxLat.' }
    }
    if (minLon >= maxLon) {
        return { valid: false, message: 'minLon must be less than maxLon.' }
    }

    return { valid: true }
}