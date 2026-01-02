import { Pool } from 'pg';

const alphaDB = new Pool({
    host: "postgres",
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

export default alphaDB;

process.on('SIGINT', async () =>{
    await alphaDB.end();
});

process.on('SIGTERM', async () =>{
    await alphaDB.end();
});
