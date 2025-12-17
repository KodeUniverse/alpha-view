import path from 'path';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io'; // WebSockets
import alphaDB from './db/connection.js';
import Messenger from './messaging.js';
import { createServer } from 'http';


const app = express();
const HOSTNAME = process.env.SERVER_HOST
const PORT = process.env.SERVER_PORT
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(__dirname);

// Initialize WebSockets
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);
    socket.on("disconnect", () => {
        console.log(`WebSocket disconnected: ${socket.id}`);
    });
});

// Redis messenger, to listen for data updates
const messenger = new Messenger();
await messenger.connect();
messenger.subscribe('finviz-data-update', async () => {
    console.log('Finviz data update signal recieved!');
    const articles = await alphaDB.query('SELECT Headline, URL, Date, Source FROM Article');

    try {
        io.emit("finviz-update", articles);
        console.log('WebSocket: Serving updated finviz data')
    } catch (error) {
        console.error(`WebSocket Error: finviz-data-update: ${error}`);
    }
});
// CORS Headers
app.use(cors());


/*
* API ROUTES
*/

app.get('/health', (req, res) => {
    res.status(200).send("Health check succeeded, API seems active!");
});


// serving static assets, caching for 1hr w/ etags
//function serveStatic(cache = '1h') {
//
//    const cacheOptions = {
//        false: { etag: false, cacheControl: false },
//        "1h": { "etag": true, "maxAge": "1h" },
//    }
//
//    console.log(`Serving static files from ${path.join(__dirname, 'static')}`);
//
//    app.use('/static', express.static(path.join(__dirname, 'static'), {
//        ...cacheOptions[cache],
//        setHeaders: (res, filepath) => {
//            const fileExt = path.extname(filepath).toLowerCase();
//            if (fileExt === '.js') {
//                res.setHeader('Content-Type', 'application/javascript');
//            } else if (fileExt === '.css') {
//                res.setHeader('Content-Type', 'text/css');
//            }
//        }
//    }));
//}

//serveStatic({ cache: false });

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

////serve the main HTML at root
//app.get('/', (req, res) => {
//    const htmlPath = path.join(__dirname, 'index.html');
//    if (!fs.existsSync(htmlPath)) {
//        res.status(500).send('Error: index.html not found on server.');
//    } else {
//        res.setHeader('Content-Type', 'text/html');
//        res.sendFile(htmlPath);
//    }
//});st

// Start server
server.listen(PORT, HOSTNAME, () => {
    console.log(`Backend AlphaView server running at http://${HOSTNAME}:${PORT}/`);
});

// Server shutdown procedure
function shutDown() {
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
process.on('SIGINT', () => {
    shutDown();
});
