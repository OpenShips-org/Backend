import Type from "typebox"

export const BaseStationPositionScheme =  Type.Object({
    mmsi: Type.Number({ examples: [205227090, 205585190, 205491290, 209410000] }),
    longitude: Type.Number({ examples: [10.0, 20.0, 30.0] }),
    latitude: Type.Number({ examples: [10.0, 20.0, 30.0] }),
    longRangeEnabled: Type.Boolean({ examples: [true, false] }),
    communicationState: Type.Number({ examples: [23588, 99447] }),
    timestamp: Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })
})