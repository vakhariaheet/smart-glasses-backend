import { Hono } from 'hono';
import { Pool } from 'mysql2/promise';
import { jwt, sign, verify, decode } from 'hono/jwt';
import Bun from 'bun';

const AuthRouter = (db: Pool) => {
    const router = new Hono();

    router.post('/login', async (c) => {
        const { email, password: passwordHash, type = "user" } = await c.req.json();
        const [ user ] = await db.execute(`
            SELECT * FROM users WHERE email = ? AND type = ?;
        `, [ email, type ]) as any;
        if (!user[ 0 ]) {
            return c.json({
                message: 'Invalid email or password'
            }, 401);
        }
        const isPasswordValid = await Bun.password.verify(passwordHash, user[ 0 ].password);
        if (!isPasswordValid) {
            return c.json({
                message: 'Invalid email or password'
            }, 401);
        }
        const accessToken = await sign({
            email: user[ 0 ].email,
            type: user[ 0 ].type,
            iat: Date.now(),
            exp: Date.now() + 1000 * 60 * 60 * 3
        }, process.env.JWT_SECRET as string)
        const refreshToken = await sign({
            email: user[ 0 ].email,
            type: user[ 0 ].type,
            iat: Date.now(),
            exp: Date.now() + 1000 * 60 * 60 * 24 * 7
        }, process.env.JWT_SECRET as string)
        return c.json({
            accessToken,
            refreshToken,
            user: {
                email: user[ 0 ].email,
                type: user[ 0 ].type,
                preferred_language: user[ 0 ].preferred_language,
                name: user[ 0 ].name,
                id: user[ 0 ].id
            }
        });

    })

    router.post('/refresh-token', async (c) => {
        const { refreshToken } = await c.req.json();
        try {
            const decoded = await verify(refreshToken, process.env.JWT_SECRET as string);
            const accessToken = await sign({
                email: decoded.email,
                type: decoded.type,
                iat: Date.now(),
                exp: Date.now() + 1000 * 60 * 60 * 3
            }, process.env.JWT_SECRET as string)
            return c.json({
                accessToken
            });
        } catch (e) {
            return c.json({
                message: 'Invalid token'
            }, 401);
        }
    });

    router.post('/register', async (c) => {
        const { email, password, name, type = "user" } = await c.req.json();
        const [ user ] = await db.execute(`
            SELECT * FROM users WHERE email = ? AND type = ?;
        `, [ email, type ]) as any;
        if (user[ 0 ]) {
            return c.json({
                message: 'User already exists'
            }, 400);
        }
        const passwordHash = await Bun.password.hash(password);
        const id = crypto.randomUUID();
        await db.execute(`
            INSERT INTO users (id,email, password, name, type) VALUES (?, ?, ?, ?,?);
        `, [ id, email, passwordHash, name, type ]);

        const accessToken = await sign({
            email,
            type,
            iat: Date.now(),
            exp: Date.now() + 1000 * 60 * 60 * 3
        }, process.env.JWT_SECRET as string);
        const refreshToken = await sign({
            email,
            type,
            iat: Date.now(),
            exp: Date.now() + 1000 * 60 * 60 * 24 * 7
        }, process.env.JWT_SECRET as string);

        return c.json({
            message: 'OK',
            accessToken,
            refreshToken,
            user: {
                email,
                type,
                name,
                id: id,
                preferred_language: 'en'
            }
        });
    })

    router.get('/me', async (c) => {
        const authHeader = c.req.headers.get('Authorization');
        if (!authHeader) {
            return c.json({
                message: 'Unauthorized'
            }, 401);
        }
        const token = authHeader.split(' ')[ 1 ];
        try {
            const decoded = await verify(token, process.env.JWT_SECRET as string);
            const user = await db.execute(`
                SELECT * FROM users WHERE email = ? AND type = ?;
            `, [ decoded.email, decoded.type ]) as any;
            return c.json({
                user: {
                    email: decoded.email,
                    name: user[ 0 ].name,
                    preferred_language: user[ 0 ].preferred_language,
                    type: decoded.type
                }
            });
        } catch (e) {
            return c.json({
                message: 'Unauthorized'
            }, 401);
        }
    })
    return router;
}


export default AuthRouter;