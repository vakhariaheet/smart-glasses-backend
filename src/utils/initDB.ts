import mysql, { Pool } from 'mysql2/promise';

const initDB = async (db: Pool) => {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS gps (
            id INT PRIMARY KEY AUTO_INCREMENT,
            latitude DECIMAL(12,10) NOT NULL,
            longitude DECIMAL(12,10) NOT NULL,
            speed DECIMAL(12,10) NOT NULL,
            track DECIMAL(12,5) NOT NULL,
            glasses_id INT NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            type ENUM('alley','user') NOT NULL DEFAULT 'user',
            preferred_language VARCHAR(5) NOT NULL DEFAULT 'en',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS user_alley (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id VARCHAR(255) NOT NULL,
            alley_id VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (alley_id) REFERENCES users(id)
        );
    `);


    await db.execute(`
        CREATE TABLE IF NOT EXISTS user_wifis (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id VARCHAR(255) NOT NULL,
            ssid VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS user_ble (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id VARCHAR(255) NOT NULL,
            mac VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `);


}

export default initDB;