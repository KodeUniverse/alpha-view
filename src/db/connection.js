import { Pool } from 'pg';

export const alphaDBPool = new Pool({
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

process.on('SIGINT', async () =>{
    await alphaDBPool.end();
});

process.on('SIGTERM', async () =>{
    await alphaDBPool.end();
});