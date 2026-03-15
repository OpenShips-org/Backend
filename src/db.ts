export async function validateTables(fastifyMariaDB: any) {
    const connection = await fastifyMariaDB.getConnection()

    // Create all required tables if they don't exist
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
                timestamp DATETIME NULL
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
                timestamp DATETIME NOT NULL,
                INDEX(mmsi),
                INDEX idx_mmsi_timestamp (mmsi, timestamp)
            )
        `)

        await connection.query(`
            CREATE TABLE IF NOT EXISTS vessel_static_info (
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
                timestamp DATETIME NULL
            )
        `)
    } catch (err) {
        console.error('Error validating tables:', err)
        throw err
    } finally {
        connection.release()
    }
}
