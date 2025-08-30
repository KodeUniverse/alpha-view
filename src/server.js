const path = require('path');
const express = require('express');
const app = express();
const cors = require('cors');
const argv = require('process').argv;

const HOSTNAME = 'localhost';
const PORT = argv[1] || 1337;

// CORS Headers
app.use(cors());

// serving static assets, caching for 1hr w/ etags
app.use('/static', express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    etag: true
}));

// serving dynamic assets, datafiles, etc. (no cache)
app.use('/data', express.static(path.join(__dirname, 'data'), {
    etag: false,
    lastModified: false,
    cacheControl: false,
    maxAge: 0,
    setHeaders: (res, filepath) => {

        fileExt = path.extname(filepath).toLowerCase();
        if (fileExt === '.json') {
            res.setHeader('Content-Type', 'application/json');
        } else if (fileExt === '.csv') {
            res.setHeader('Content-Type', 'text/csv');
        }
    }
}));

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
