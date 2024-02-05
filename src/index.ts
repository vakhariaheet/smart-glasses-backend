import mysql from 'mysql2/promise';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { GPS } from '../types';
import initDB from './utils/initDB';
import AuthRouter from './routes/auth/Auth';
// Create an instance of Hono
const app = new Hono();
const PORT = process.env.PORT || 3000;
// Use middleware
app.use('*', cors(
    {
        origin: '*',
        allowMethods: [ 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS' ],

    }
));
app.use('*', logger());


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

app.route('/auth', AuthRouter(pool));

app.get('/', (c) => {
    return c.json({
        message: 'Hello, world!'
    });
});


app.post('/api/update-coors', async (c) => {
    const gpsData = (await c.req.json()) as Omit<Omit<GPS, 'id'>, 'timestamp'> & { code: string };

    if (gpsData.code !== process.env.CODE) {
        console.log(gpsData.code, process.env.CODE);
        return c.json({
            message: 'Invalid code'
        });

    }
    const lastcoords = await pool.execute(`
        SELECT * FROM gps ORDER BY user_id = '${gpsData.userId}' DESC LIMIT 1;
    `) as any;
    const lastcoord = lastcoords[ 0 ][ 0 ] as GPS;

    if (!lastcoord) {
        console.log('No last coord');
        await pool.execute(`
            INSERT INTO gps (latitude, longitude, speed, track, glasses_id,user_id) VALUES (?, ?, ?, ?, ?, ?);
        `, [ gpsData.latitude, gpsData.longitude, gpsData.speed, gpsData.track, gpsData.glasses_id, gpsData.userId ]);
        return c.json({
            message: 'OK'
        });
    }

    const distance = Math.sqrt(Math.pow(lastcoord.latitude - gpsData.latitude, 2) + Math.pow(lastcoord.longitude - gpsData.longitude, 2));
    if (distance > 0.0001) {
        await pool.execute(`
            INSERT INTO gps (latitude, longitude, speed, track, glasses_id,user_id) VALUES (?, ?, ?, ?, ?, ?);
        `, [ gpsData.latitude, gpsData.longitude, gpsData.speed, gpsData.track, gpsData.glasses_id ]);
    }

    return c.json({
        message: 'OK'
    });
})

app.get('/api/get-coors', async (c) => {
    const { code, userId } = c.req.query() as { code: string; userId: string };
    if (code !== process.env.CODE) {
        c.json({
            message: 'Invalid code'
        }, 403);
        return;
    }
    const coords = await pool.execute(`
        SELECT * FROM gps ORDER BY user_id='${userId}' DESC LIMIT 1;
    `) as any;
    const coord = coords[ 0 ][ 0 ] as GPS;
    return c.json(coord, 200);
});

app.post('/api/add-alley', async (c) => {

    const { userId, alleyEmail } = (await c.req.json()) as { userId: string, alleyEmail: string };

    console.log(userId, alleyEmail);
    const [ user ] = await pool.execute(`
        SELECT * FROM users WHERE id = ?;
    `, [ userId ]) as any;
    if (!user[ 0 ]) {
        return c.json({
            message: 'User does not exist'
        }, 400);
    }
    const [ alley ] = await pool.execute(`
        SELECT * FROM users WHERE email = ? AND type = 'alley';
    `, [ alleyEmail ]) as any;
    if (!alley[ 0 ]) {
        return c.json({
            message: 'Alley does not exist'
        }, 400);
    }
    const [ userAlley ] = await pool.execute(`
        SELECT * FROM user_alley WHERE user_id = ? AND alley_id = ?;`, [ userId, alley[ 0 ].id ])
    if (userAlley[ 0 ]) {
        return c.json({
            message: 'User already in alley'
        }, 200);
    }
    console.log(alley[ 0 ].id);
    await pool.execute(`
        INSERT INTO user_alley (user_id, alley_id) VALUES (?, ?);
    `, [ userId, alley[ 0 ].id ]);

    return c.json({
        message: 'OK'
    }, 200);
})
app.get('/api/alleys', async (c) => {
    const { userId } = c.req.query() as { userId: string };
    console.log(userId);
    const [ user ] = await pool.execute(`
        SELECT * FROM users WHERE id = ?;
    `, [ userId ]) as any;
    if (!user[ 0 ]) {
        return c.json({
            message: 'User does not exist'
        }, 400);
    }

    const [ users ] = await pool.execute(`
        SELECT * FROM users WHERE type = 'user' AND id IN (SELECT user_id FROM user_alley WHERE alley_id = ?);
    `, [ userId ]) as any;


    return c.json(users, 200);
})

console.log(`Server running on port ${PORT} 🚀`);
export default {
    port: process.env.PORT || PORT,
    fetch: app.fetch,
}
