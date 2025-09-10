import path from 'path';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { argv } from 'process';
import { fileURLToPath } from 'url';

const app = express();
const HOSTNAME = '0.0.0.0';
const PORT = process.env.PORT || argv[2] || 1337; // resolve portnumber as CLI arg
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(__dirname);

// CORS Headers
app.use(cors());

// serving static assets, caching for 1hr w/ etags
function serveStatic(cache = '1h'){

    const cacheOptions = {
        false: {etag: false, cacheControl: false},
        "1h": {"etag": true, "maxAge": "1h"},
    }

    console.log(`Serving static files from ${path.join(__dirname,'static')}`);

    app.use('/static', express.static(path.join(__dirname,'static'), {
    ...cacheOptions[cache],
    setHeaders: (res, filepath) => {
        const fileExt = path.extname(filepath).toLowerCase();
        if (fileExt === '.js') {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (fileExt === '.css') {
            res.setHeader('Content-Type', 'text/css');
        }
    }}));
}

serveStatic({cache: false});

// serving dynamic assets, datafiles, etc. (no cache)
app.use('/data', express.static(path.join(__dirname, 'data'), {
    etag: false,
    lastModified: false,
    cacheControl: false,
    maxAge: 0,
    setHeaders: (res, filepath) => {

        const fileExt = path.extname(filepath).toLowerCase();
        if (fileExt === '.json') {
            res.setHeader('Content-Type', 'application/json');
        } else if (fileExt === '.csv') {
            res.setHeader('Content-Type', 'text/csv');
        }
    }
}));

//serve the main HTML at root
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'index.html');
    if (!fs.existsSync(htmlPath)) {
        res.status(500).send('Error: index.html not found on server.');
    } else {
        res.setHeader('Content-Type', 'text/html');
        res.sendFile(htmlPath);
    } 
});

// Start server
const server = app.listen(PORT, HOSTNAME, () =>{
    console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});

// Server shutdown procedure
function shutDown(){
    console.log(`Recieved kill signal, gracefully shutting down http://${HOSTNAME}:${PORT}/`);
    server.close(() => {
        console.log('Graceful shutdown complete!');
	process.exit();
    });

    setTimeout(() => {
        console.log('Graceful shutdown timed out (10s). Killing forcibly.');
        process.exit(1);
    }, 10000)
};

// Listen for Ctrl+C to stop server
process.on('SIGINT', () =>{
    shutDown();
});