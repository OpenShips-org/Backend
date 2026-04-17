import type { FastifyInstance } from "fastify"

export async function validateTables(fastify: FastifyInstance) {
    try {
        await fastify.mariadb.query("SET time_zone = '+00:00'")
    } catch (err) {
        console.warn('Could not set session time_zone to UTC:', err)
    }

    try {
        await fastify.mariadb.query(`
            CREATE TABLE IF NOT EXISTS current_vessel_positions (
                mmsi VARCHAR(20) PRIMARY KEY,
                vesselName VARCHAR(255) NULL,
                navigationalStatus INT NULL,
                rateOfTurn DOUBLE NULL,
                speedOverGround DOUBLE NULL,
                courseOverGround DOUBLE NULL,
                heading INT NULL,
                longitude DOUBLE NULL,
                latitude DOUBLE NULL,
                specialManoeuvre INT NULL,
                communicationState INT NULL,
                timestamp TIMESTAMP NULL
            )
        `)

        await fastify.mariadb.query(`
            CREATE TABLE IF NOT EXISTS historical_vessel_positions (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                mmsi VARCHAR(20) NOT NULL,
                vesselName VARCHAR(255) NULL,
                navigationalStatus INT NULL,
                rateOfTurn DOUBLE NULL,
                speedOverGround DOUBLE NULL,
                courseOverGround DOUBLE NULL,
                heading INT NULL,
                longitude DOUBLE NULL,
                latitude DOUBLE NULL,
                specialManoeuvre INT NULL,
                communicationState INT NULL,
                timestamp TIMESTAMP NOT NULL,
                INDEX(mmsi),
                INDEX idx_mmsi_timestamp (mmsi, timestamp)
            )
        `)

        await fastify.mariadb.query(`
            CREATE TABLE IF NOT EXISTS static_ship_data (
                mmsi VARCHAR(20) PRIMARY KEY,
                imo VARCHAR(20) NULL,
                callSign VARCHAR(50) NULL,
                vesselName VARCHAR(255) NULL,
                destination VARCHAR(255) NULL,
                eta DATETIME NULL,
                vesselType INT NULL,
                maxDraught INT NULL,
                dimensionA INT NULL,
                dimensionB INT NULL,
                dimensionC INT NULL,
                dimensionD INT NULL,
                timestamp TIMESTAMP NULL
            )
        `)

        await fastify.mariadb.query(`
            CREATE TABLE IF NOT EXISTS base_stations (
                mmsi VARCHAR(20) PRIMARY KEY,
                latitude DOUBLE NULL,
                longitude DOUBLE NULL,
                longRangeEnabled BOOLEAN NULL,
                communicationState INT NULL,
                timestamp TIMESTAMP NOT NULL
            )
        `)

        await fastify.mariadb.query(`
            CREATE TABLE IF NOT EXISTS vessel_data (
                imo_number INT PRIMARY KEY,
                mmsi_number BIGINT NULL,
                vessel_name VARCHAR(255) NULL,
                flag VARCHAR(100) NULL,
                call_sign VARCHAR(50) NULL,
                vessel_type VARCHAR(100) NULL,
                gross_tonnage INT NULL,
                dwt INT NULL,
                year_built INT NULL,
                status VARCHAR(100) NULL,
                status_date DATE NULL,
                last_update TIMESTAMP NULL,
                has_dnv_entry BOOLEAN NOT NULL,
                has_equasis_entry BOOLEAN NOT NULL,
                dnv_data JSON NULL,
                equasis_data JSON NULL,
                last_scraped TIMESTAMP NULL
            )
        `)

        await fastify.mariadb.query(`
            CREATE TABLE IF NOT EXISTS ports (
                world_port_index_number INT PRIMARY KEY,
                region_name VARCHAR(255),
                main_port_name VARCHAR(255),
                alternate_port_name VARCHAR(255),
                un_locode VARCHAR(20),
                country_code VARCHAR(255),
                world_water_body VARCHAR(255),
                sailing_direction_or_publication VARCHAR(255),
                publication_link VARCHAR(255),
                standard_nautical_chart VARCHAR(255),
                iho_s57_electronic_navigational_chart VARCHAR(255),
                iho_s101_electronic_navigational_chart VARCHAR(255),
                digital_nautical_chart VARCHAR(255),
                tidal_range_m FLOAT,
                entrance_width_m FLOAT,
                channel_depth_m FLOAT,
                anchorage_depth_m FLOAT,
                cargo_pier_depth_m FLOAT,
                oil_terminal_depth_m FLOAT,
                lng_terminal_depth_m FLOAT,
                max_vessel_length_m FLOAT,
                max_vessel_beam_m FLOAT,
                max_vessel_draft_m FLOAT,
                offshore_max_vessel_length_m FLOAT,
                offshore_max_vessel_beam_m FLOAT,
                offshore_max_vessel_draft_m FLOAT,
                harbor_size VARCHAR(50),
                harbor_type VARCHAR(50),
                harbor_use VARCHAR(50),
                shelter_afforded BOOLEAN,
                entrance_restriction_tide BOOLEAN,
                entrance_restriction_heavy_swell BOOLEAN,
                entrance_restriction_ice BOOLEAN,
                entrance_restriction_other BOOLEAN,
                overhead_limits BOOLEAN,
                underkeel_clearance_management_system BOOLEAN,
                good_holding_ground BOOLEAN,
                turning_area BOOLEAN,
                port_security BOOLEAN,
                eta_message BOOLEAN,
                quarantine_pratique BOOLEAN,
                quarantine_sanitation BOOLEAN,
                quarantine_other BOOLEAN,
                traffic_separation_scheme BOOLEAN,
                vessel_traffic_service BOOLEAN,
                first_port_of_entry BOOLEAN,
                us_representative BOOLEAN,
                pilotage_compulsory BOOLEAN,
                pilotage_available BOOLEAN,
                pilotage_local_assistance BOOLEAN,
                pilotage_advisable BOOLEAN,
                tugs_salvage BOOLEAN,
                tugs_assistance BOOLEAN,
                comm_telephone BOOLEAN,
                comm_telefax BOOLEAN,
                comm_radio BOOLEAN,
                comm_radiotelephone BOOLEAN,
                comm_airport BOOLEAN,
                comm_rail BOOLEAN,
                search_and_rescue BOOLEAN,
                navarea VARCHAR(10),
                facilities_wharves BOOLEAN,
                facilities_anchorage BOOLEAN,
                facilities_dangerous_cargo_anchorage BOOLEAN,
                facilities_med_mooring BOOLEAN,
                facilities_beach_mooring BOOLEAN,
                facilities_ice_mooring BOOLEAN,
                facilities_roro BOOLEAN,
                facilities_solid_bulk BOOLEAN,
                facilities_liquid_bulk BOOLEAN,
                facilities_container BOOLEAN,
                facilities_breakbulk BOOLEAN,
                facilities_oil_terminal BOOLEAN,
                facilities_lng_terminal BOOLEAN,
                facilities_other BOOLEAN,
                medical_facilities BOOLEAN,
                garbage_disposal BOOLEAN,
                chemical_holding_tank_disposal BOOLEAN,
                degaussing BOOLEAN,
                dirty_ballast_disposal BOOLEAN,
                cranes_fixed BOOLEAN,
                cranes_mobile BOOLEAN,
                cranes_floating BOOLEAN,
                cranes_container BOOLEAN,
                lifts_100_tons BOOLEAN,
                lifts_50_100_tons BOOLEAN,
                lifts_25_49_tons BOOLEAN,
                lifts_0_24_tons BOOLEAN,
                services_longshoremen BOOLEAN,
                services_electricity BOOLEAN,
                services_steam BOOLEAN,
                services_navigation_equipment BOOLEAN,
                services_electrical_repair BOOLEAN,
                services_ice_breaking BOOLEAN,
                services_diving BOOLEAN,
                supplies_provisions BOOLEAN,
                supplies_potable_water BOOLEAN,
                supplies_fuel_oil BOOLEAN,
                supplies_diesel_oil BOOLEAN,
                supplies_aviation_fuel BOOLEAN,
                supplies_deck BOOLEAN,
                supplies_engine BOOLEAN,
                repairs BOOLEAN,
                dry_dock BOOLEAN,
                railway BOOLEAN,
                latitude FLOAT,
                longitude FLOAT,

                INDEX idx_region_name (region_name),
                INDEX idx_main_port_name (main_port_name),
                INDEX idx_country_code (country_code),
                INDEX idx_world_water_body (world_water_body),
                INDEX idx_long_lat (longitude, latitude)
            );
        `)
    } catch (err) {
        console.error('Error validating tables:', err)
        throw err
    }
}
