import Type from "typebox"

export const VesselPositionSchema = Type.Object({
    mmsi: Type.Number({ examples: [205227090, 205585190, 205491290, 209410000] }),
    vesselName: Type.String({ examples: ['DONAU', 'PRESTIGE', 'RIVER DRONE 2', 'SANTIAGO'] }),
    navigationalStatus: Type.Number({ examples: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }),
    rateOfTurn: Type.Number({ examples: [-128, -64, 0, 64, 127] }),
    speedOverGround: Type.Number({ examples: [0, 10, 20, 30] }),
    courseOverGround: Type.Number({ examples: [0, 90, 180, 270] }),
    heading: Type.Number({ examples: [0, 90, 180, 270] }),
    longitude: Type.Number({ examples: [10.0, 20.0, 30.0] }),
    latitude: Type.Number({ examples: [10.0, 20.0, 30.0] }),
    specialManoeuvre: Type.Number({ examples: [0, 1] }),
    communicationState: Type.Number({ examples: [0, 1] }),
    timestamp: Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })
})