export async function validateTables(fastifyMariaDB: any) {
    const connection = await fastifyMariaDB.getConnection()

    try {
        await connection.query("SET time_zone = '+00:00'")
    } catch (err) {
        console.warn('Could not set session time_zone to UTC:', err)
    }

    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS current_vessel_positions (
                mmsi VARCHAR(20) PRIMARY KEY,
                ship_name VARCHAR(255) NULL,
                navigation_status INT NULL,
                rot DOUBLE NULL,
                sog DOUBLE NULL,
                cog DOUBLE NULL,
                true_heading INT NULL,
                longitude DOUBLE NULL,
                latitude DOUBLE NULL,
                special_manoeuvre INT NULL,
                communication_state INT NULL,
                timestamp TIMESTAMP NULL
            )
        `)

        await connection.query(`
            CREATE TABLE IF NOT EXISTS historical_vessel_positions (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                mmsi VARCHAR(20) NOT NULL,
                ship_name VARCHAR(255) NULL,
                navigation_status INT NULL,
                rot DOUBLE NULL,
                sog DOUBLE NULL,
                cog DOUBLE NULL,
                true_heading INT NULL,
                longitude DOUBLE NULL,
                latitude DOUBLE NULL,
                special_manoeuvre INT NULL,
                communication_state INT NULL,
                timestamp TIMESTAMP NOT NULL,
                INDEX(mmsi),
                INDEX idx_mmsi_timestamp (mmsi, timestamp)
            )
        `)

        await connection.query(`
            CREATE TABLE IF NOT EXISTS static_ship_data (
                mmsi VARCHAR(20) PRIMARY KEY,
                imo VARCHAR(20) NULL,
                call_sign VARCHAR(50) NULL,
                ship_name VARCHAR(255) NULL,
                destination VARCHAR(255) NULL,
                eta DATETIME NULL,
                ship_type INT NULL,
                max_draught INT NULL,
                dimensionA INT NULL,
                dimensionB INT NULL,
                dimensionC INT NULL,
                dimensionD INT NULL,
                timestamp TIMESTAMP NULL
            )
        `)

        await connection.query(`
            CREATE TABLE IF NOT EXISTS base_station_reports (
                mmsi VARCHAR(20) PRIMARY KEY,
                latitude DOUBLE NULL,
                longitude DOUBLE NULL,
                long_range_enabled BOOLEAN NULL,
                communication_state INT NULL,
                timestamp TIMESTAMP NOT NULL
            )
        `)
    } catch (err) {
        console.error('Error validating tables:', err)
        throw err
    } finally {
        connection.release()
    }
}
