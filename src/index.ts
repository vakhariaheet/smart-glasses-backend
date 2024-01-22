import mysql from 'mysql2/promise';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GPS } from '../types';
import initDB from './utils/initDB';


// Load environment variables
dotenv.config();

// Create a new Express application
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
});
(async () => { 
    initDB(pool);
})();



app.get('/', async (req, res) => {
    res.send({
        message: 'Hello world!'
    });
});

app.post('/api/update-coors', async (req, res) => { 
    const gpsData = req.body as Omit<Omit<GPS, 'id'>, 'timestamp'> & { code: string };
    if (gpsData.code !== process.env.CODE) { 
        res.status(403).send({
            message: 'Invalid code'
        });
        return;
    }
    const lastcoords = await pool.execute(`
        SELECT * FROM gps ORDER BY id DESC LIMIT 1;
    `) as any;
    const lastcoord = lastcoords[ 0 ][ 0 ] as GPS;
    if (!lastcoord) { 
        await pool.execute(`
            INSERT INTO gps (latitude, longitude, speed, track, glasses_id) VALUES (?, ?, ?, ?, ?);
        `, [ gpsData.latitude, gpsData.longitude, gpsData.speed, gpsData.track, gpsData.glasses_id ]);
        return;
    }
    const distance = Math.sqrt(Math.pow(lastcoord.latitude - gpsData.latitude, 2) + Math.pow(lastcoord.longitude - gpsData.longitude, 2));
    if (distance > 0.0001) { 
        await pool.execute(`
            INSERT INTO gps (latitude, longitude, speed, track, glasses_id) VALUES (?, ?, ?, ?, ?);
        `, [ gpsData.latitude, gpsData.longitude, gpsData.speed, gpsData.track, gpsData.glasses_id ]);
    }
    res.send({
        message: 'OK'
    });
})

app.get('/api/get-coors', async (req, res) => { 
    const { code } = req.query;
    if (code !== process.env.CODE) { 
        res.status(403).send({
            message: 'Invalid code'
        });
        return;
    }
    const coords = await pool.execute(`
        SELECT * FROM gps ORDER BY id DESC LIMIT 1;
    `) as any;
    const coord = coords[ 0 ][ 0 ] as GPS;
    res.send({
        latitude: coord.latitude,
        longitude: coord.longitude,
        speed: coord.speed,
        track: coord.track,
        glasses_id: coord.glasses_id,
    });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
