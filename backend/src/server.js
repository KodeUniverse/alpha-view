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
const HOSTNAME = "0.0.0.0";
const PORT = 8080;

const HOST_PORT = process.env.HOST_API_PORT;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CORS Headers
app.use(cors());

// Initialize Socket.iio
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


/*
 * Market Data
 */

// Listen for data update signal and serve market news data thru Socket.IO
messenger.subscribe('ft-news', async () => {
    console.log('Market news update signal recieved!');
    const articles = await alphaDB.query('SELECT ArticleId, Headline, Descr, URL, PubDate, NewsSource FROM Article');

    try {
        io.emit("market-news", articles.rows);
        console.log('WebSocket: Serving updated market news data')
    } catch (error) {
        console.error(`WebSocket Error (market news): ${error}`);
    }
});

/*
* API ROUTES
*/

app.get('/health', (req, res) => {
    res.status(200).send("Health check succeeded, API seems active!");
});


app.get('/api/market-news/latest', async (req, res) => {
    const articles = await alphaDB.query('SELECT ArticleId, Headline, Descr, URL, PubDate, NewsSource FROM Article');
    if (articles) {
        res.status(200).send(articles.rows);
    } else {
        res.status(200).json(null);
    }
});

//// serving dynamic assets, datafiles, etc. (no cache)
//app.use('/data', express.static(path.join(__dirname, 'data'), {
//    etag: false,
//    lastModified: false,
//    cacheControl: false,
//    maxAge: 0,
//    setHeaders: (res, filepath) => {
//
//        const fileExt = path.extname(filepath).toLowerCase();
//        if (fileExt === '.json') {
//            res.setHeader('Content-Type', 'application/json');
//        } else if (fileExt === '.csv') {
//            res.setHeader('Content-Type', 'text/csv');
//        }
//    }
//}));

// Start server
server.listen(PORT, HOSTNAME, () => {
    console.log(`Backend AlphaView server running at http://localhost:${HOST_PORT}/`);
});


// Listen for Ctrl+C to shutdown server
process.on('SIGINT', () => {
    console.log(`Recieved kill signal, gracefully shutting down http://localhost:${HOST_PORT}/`);
    server.close(() => {
        console.log('Graceful shutdown complete!');
        process.exit();
    });

    setTimeout(() => {
        console.log('Graceful shutdown timed out (10s). Killing forcibly.');
        process.exit(1);
    }, 10000)
});
