import mysql, { Pool } from 'mysql2/promise';

const initDB = async (db:Pool) => { 
    await db.execute(`
        CREATE TABLE IF NOT EXISTS gps (
            id INT PRIMARY KEY AUTO_INCREMENT,
            latitude DECIMAL(12,10) NOT NULL,
            longitude DECIMAL(12,10) NOT NULL,
            speed DECIMAL(12,10) NOT NULL,
            track DECIMAL(12,10) NOT NULL,
            timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

    `);

}

export default initDB;