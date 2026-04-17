import Type from "typebox"

export const PortPositionSchema = Type.Object({
    world_port_index_number: Type.String({ examples: ['12345', '67890'] }),
    main_port_name: Type.String({ examples: ['Port of Rotterdam', 'Port of Singapore'] }),
    un_locode: Type.String({ examples: ['NL RTM', 'SG SIN'] }),
    country_code: Type.String({ examples: ['NL', 'SG'] }),
    latitude: Type.Number({ examples: [51.95, 1.25] }),
    longitude: Type.Number({ examples: [4.15, 103.75] }),
    harbor_type: Type.String({ examples: ['Coastal (Natural)', 'River (Natural)'] }),
    harbor_size: Type.String({ examples: ['Very Small', 'Small', 'Medium'] })
})