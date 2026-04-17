import type { FastifyInstance } from 'fastify'
import fs from 'fs'
import csvParser from 'csv-parser'

export default async function importPorts(fastify: FastifyInstance, filePath: string): Promise<void> {
    let results: any[] = []

    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    for (const row of results) {
                        const yesNoToBoolean = (value: string): boolean => {
                            return value.toLowerCase() === 'yes'
                        }

                        const parseFloat_ = (value: string): number | null => {
                            const parsed = parseFloat(value)
                            return isNaN(parsed) ? null : parsed
                        }

                        const query = `INSERT IGNORE INTO ports (
                            world_port_index_number, region_name, main_port_name, alternate_port_name,
                            un_locode, country_code, world_water_body, sailing_direction_or_publication,
                            publication_link, standard_nautical_chart, iho_s57_electronic_navigational_chart,
                            iho_s101_electronic_navigational_chart, digital_nautical_chart, tidal_range_m,
                            entrance_width_m, channel_depth_m, anchorage_depth_m, cargo_pier_depth_m,
                            oil_terminal_depth_m, lng_terminal_depth_m, max_vessel_length_m,
                            max_vessel_beam_m, max_vessel_draft_m, offshore_max_vessel_length_m,
                            offshore_max_vessel_beam_m, offshore_max_vessel_draft_m, harbor_size,
                            harbor_type, harbor_use, shelter_afforded, entrance_restriction_tide,
                            entrance_restriction_heavy_swell, entrance_restriction_ice, entrance_restriction_other,
                            overhead_limits, underkeel_clearance_management_system, good_holding_ground,
                            turning_area, port_security, eta_message, quarantine_pratique,
                            quarantine_sanitation, quarantine_other, traffic_separation_scheme,
                            vessel_traffic_service, first_port_of_entry, us_representative,
                            pilotage_compulsory, pilotage_available, pilotage_local_assistance,
                            pilotage_advisable, tugs_salvage, tugs_assistance, comm_telephone,
                            comm_telefax, comm_radio, comm_radiotelephone, comm_airport,
                            comm_rail, search_and_rescue, navarea, facilities_wharves,
                            facilities_anchorage, facilities_dangerous_cargo_anchorage, facilities_med_mooring,
                            facilities_beach_mooring, facilities_ice_mooring, facilities_roro,
                            facilities_solid_bulk, facilities_liquid_bulk, facilities_container,
                            facilities_breakbulk, facilities_oil_terminal, facilities_lng_terminal,
                            facilities_other, medical_facilities, garbage_disposal,
                            chemical_holding_tank_disposal, degaussing, dirty_ballast_disposal,
                            cranes_fixed, cranes_mobile, cranes_floating, cranes_container,
                            lifts_100_tons, lifts_50_100_tons, lifts_25_49_tons, lifts_0_24_tons,
                            services_longshoremen, services_electricity, services_steam,
                            services_navigation_equipment, services_electrical_repair, services_ice_breaking,
                            services_diving, supplies_provisions, supplies_potable_water,
                            supplies_fuel_oil, supplies_diesel_oil, supplies_aviation_fuel,
                            supplies_deck, supplies_engine, repairs, dry_dock, railway,
                            latitude, longitude
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?, ?
                        )`

                        const values = [
                            parseInt(row['World Port Index Number']),
                            row['Region Name'] || null,
                            row['Main Port Name'] || null,
                            row['Alternate Port Name'] || null,
                            row['UN/LOCODE'] || null,
                            row['Country Code'] || null,
                            row['World Water Body'] || null,
                            row['Sailing Direction or Publication'] || null,
                            row['Publication Link'] || null,
                            row['Standard Nautical Chart'] || null,
                            row['IHO S-57 Electronic Navigational Chart'] || null,
                            row['IHO S-101 Electronic Navigational Chart'] || null,
                            row['Digital Nautical Chart'] || null,
                            parseFloat_(row['Tidal Range (m)']),
                            parseFloat_(row['Entrance Width (m)']),
                            parseFloat_(row['Channel Depth (m)']),
                            parseFloat_(row['Anchorage Depth (m)']),
                            parseFloat_(row['Cargo Pier Depth (m)']),
                            parseFloat_(row['Oil Terminal Depth (m)']),
                            parseFloat_(row['Liquified Natural Gas Terminal Depth (m)']),
                            parseFloat_(row['Maximum Vessel Length (m)']),
                            parseFloat_(row['Maximum Vessel Beam (m)']),
                            parseFloat_(row['Maximum Vessel Draft (m)']),
                            parseFloat_(row['Offshore Maximum Vessel Length (m)']),
                            parseFloat_(row['Offshore Maximum Vessel Beam (m)']),
                            parseFloat_(row['Offshore Maximum Vessel Draft (m)']),
                            row['Harbor Size'] || null,
                            row['Harbor Type'] || null,
                            row['Harbor Use'] || null,
                            row['Shelter Afforded'] ? yesNoToBoolean(row['Shelter Afforded']) : null,
                            row['Entrance Restriction - Tide'] ? yesNoToBoolean(row['Entrance Restriction - Tide']) : null,
                            row['Entrance Restriction - Heavy Swell'] ? yesNoToBoolean(row['Entrance Restriction - Heavy Swell']) : null,
                            row['Entrance Restriction - Ice'] ? yesNoToBoolean(row['Entrance Restriction - Ice']) : null,
                            row['Entrance Restriction - Other'] ? yesNoToBoolean(row['Entrance Restriction - Other']) : null,
                            row['Overhead Limits'] ? yesNoToBoolean(row['Overhead Limits']) : null,
                            row['Underkeel Clearance Management System'] ? yesNoToBoolean(row['Underkeel Clearance Management System']) : null,
                            row['Good Holding Ground'] ? yesNoToBoolean(row['Good Holding Ground']) : null,
                            row['Turning Area'] ? yesNoToBoolean(row['Turning Area']) : null,
                            row['Port Security'] ? yesNoToBoolean(row['Port Security']) : null,
                            row['Estimated Time of Arrival Message'] ? yesNoToBoolean(row['Estimated Time of Arrival Message']) : null,
                            row['Quarantine - Pratique'] ? yesNoToBoolean(row['Quarantine - Pratique']) : null,
                            row['Quarantine - Sanitation'] ? yesNoToBoolean(row['Quarantine - Sanitation']) : null,
                            row['Quarantine - Other'] ? yesNoToBoolean(row['Quarantine - Other']) : null,
                            row['Traffic Separation Scheme'] ? yesNoToBoolean(row['Traffic Separation Scheme']) : null,
                            row['Vessel Traffic Service'] ? yesNoToBoolean(row['Vessel Traffic Service']) : null,
                            row['First Port of Entry'] ? yesNoToBoolean(row['First Port of Entry']) : null,
                            row['US Representative'] ? yesNoToBoolean(row['US Representative']) : null,
                            row['Pilotage - Compulsory'] ? yesNoToBoolean(row['Pilotage - Compulsory']) : null,
                            row['Pilotage - Available'] ? yesNoToBoolean(row['Pilotage - Available']) : null,
                            row['Pilotage - Local Assistance'] ? yesNoToBoolean(row['Pilotage - Local Assistance']) : null,
                            row['Pilotage - Advisable'] ? yesNoToBoolean(row['Pilotage - Advisable']) : null,
                            row['Tugs - Salvage'] ? yesNoToBoolean(row['Tugs - Salvage']) : null,
                            row['Tugs - Assistance'] ? yesNoToBoolean(row['Tugs - Assistance']) : null,
                            row['Communications - Telephone'] ? yesNoToBoolean(row['Communications - Telephone']) : null,
                            row['Communications - Telefax'] ? yesNoToBoolean(row['Communications - Telefax']) : null,
                            row['Communications - Radio'] ? yesNoToBoolean(row['Communications - Radio']) : null,
                            row['Communications - Radiotelephone'] ? yesNoToBoolean(row['Communications - Radiotelephone']) : null,
                            row['Communications - Airport'] ? yesNoToBoolean(row['Communications - Airport']) : null,
                            row['Communications - Rail'] ? yesNoToBoolean(row['Communications - Rail']) : null,
                            row['Search and Rescue'] ? yesNoToBoolean(row['Search and Rescue']) : null,
                            row['NAVAREA'] || null,
                            row['Facilities - Wharves'] ? yesNoToBoolean(row['Facilities - Wharves']) : null,
                            row['Facilities - Anchorage'] ? yesNoToBoolean(row['Facilities - Anchorage']) : null,
                            row['Facilities - Dangerous Cargo Anchorage'] ? yesNoToBoolean(row['Facilities - Dangerous Cargo Anchorage']) : null,
                            row['Facilities - Med Mooring'] ? yesNoToBoolean(row['Facilities - Med Mooring']) : null,
                            row['Facilities - Beach Mooring'] ? yesNoToBoolean(row['Facilities - Beach Mooring']) : null,
                            row['Facilities - Ice Mooring'] ? yesNoToBoolean(row['Facilities - Ice Mooring']) : null,
                            row['Facilities - Ro-Ro'] ? yesNoToBoolean(row['Facilities - Ro-Ro']) : null,
                            row['Facilities - Solid Bulk'] ? yesNoToBoolean(row['Facilities - Solid Bulk']) : null,
                            row['Facilities - Liquid Bulk'] ? yesNoToBoolean(row['Facilities - Liquid Bulk']) : null,
                            row['Facilities - Container'] ? yesNoToBoolean(row['Facilities - Container']) : null,
                            row['Facilities - Breakbulk'] ? yesNoToBoolean(row['Facilities - Breakbulk']) : null,
                            row['Facilities - Oil Terminal'] ? yesNoToBoolean(row['Facilities - Oil Terminal']) : null,
                            row['Facilities - LNG Terminal'] ? yesNoToBoolean(row['Facilities - LNG Terminal']) : null,
                            row['Facilities - Other'] ? yesNoToBoolean(row['Facilities - Other']) : null,
                            row['Medical Facilities'] ? yesNoToBoolean(row['Medical Facilities']) : null,
                            row['Garbage Disposal'] ? yesNoToBoolean(row['Garbage Disposal']) : null,
                            row['Chemical Holding Tank Disposal'] ? yesNoToBoolean(row['Chemical Holding Tank Disposal']) : null,
                            row['Degaussing'] ? yesNoToBoolean(row['Degaussing']) : null,
                            row['Dirty Ballast Disposal'] ? yesNoToBoolean(row['Dirty Ballast Disposal']) : null,
                            row['Cranes - Fixed'] ? yesNoToBoolean(row['Cranes - Fixed']) : null,
                            row['Cranes - Mobile'] ? yesNoToBoolean(row['Cranes - Mobile']) : null,
                            row['Cranes - Floating'] ? yesNoToBoolean(row['Cranes - Floating']) : null,
                            row['Cranes - Container'] ? yesNoToBoolean(row['Cranes - Container']) : null,
                            row['Lifts - 100+ Tons'] ? yesNoToBoolean(row['Lifts - 100+ Tons']) : null,
                            row['Lifts - 50-100 Tons'] ? yesNoToBoolean(row['Lifts - 50-100 Tons']) : null,
                            row['Lifts - 25-49 Tons'] ? yesNoToBoolean(row['Lifts - 25-49 Tons']) : null,
                            row['Lifts - 0-24 Tons'] ? yesNoToBoolean(row['Lifts - 0-24 Tons']) : null,
                            row['Services - Longshoremen'] ? yesNoToBoolean(row['Services - Longshoremen']) : null,
                            row['Services - Electricity'] ? yesNoToBoolean(row['Services - Electricity']) : null,
                            row['Services - Steam'] ? yesNoToBoolean(row['Services - Steam']) : null,
                            row['Services - Navigation Equipment'] ? yesNoToBoolean(row['Services - Navigation Equipment']) : null,
                            row['Services - Electrical Repair'] ? yesNoToBoolean(row['Services - Electrical Repair']) : null,
                            row['Services - Ice Breaking'] ? yesNoToBoolean(row['Services - Ice Breaking']) : null,
                            row['Services - Diving'] ? yesNoToBoolean(row['Services - Diving']) : null,
                            row['Supplies - Provisions'] ? yesNoToBoolean(row['Supplies - Provisions']) : null,
                            row['Supplies - Potable Water'] ? yesNoToBoolean(row['Supplies - Potable Water']) : null,
                            row['Supplies - Fuel Oil'] ? yesNoToBoolean(row['Supplies - Fuel Oil']) : null,
                            row['Supplies - Diesel Oil'] ? yesNoToBoolean(row['Supplies - Diesel Oil']) : null,
                            row['Supplies - Aviation Fuel'] ? yesNoToBoolean(row['Supplies - Aviation Fuel']) : null,
                            row['Supplies - Deck'] ? yesNoToBoolean(row['Supplies - Deck']) : null,
                            row['Supplies - Engine'] ? yesNoToBoolean(row['Supplies - Engine']) : null,
                            row['Repairs'] ? yesNoToBoolean(row['Repairs']) : null,
                            row['Dry Dock'] ? yesNoToBoolean(row['Dry Dock']) : null,
                            row['Railway'] ? yesNoToBoolean(row['Railway']) : null,
                            parseFloat_(row['Latitude']),
                            parseFloat_(row['Longitude'])
                        ]

                        try {
                            await fastify.mariadb.query(query, values)
                        } catch (err) {
                            console.warn(`Failed to insert port ${row['World Port Index Number']}:`, err)
                        }
                    }
                    resolve()
                } catch (err) {
                    reject(err)
                }
            })
            .on('error', (err) => reject(err))
    })
}