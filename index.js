#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const qrcode = require('qrcode-terminal');
const localtunnel = require('localtunnel'); // Added localtunnel

const filePath = process.argv[2];

if (!filePath) {
    console.log('Please specify a file path!');
    console.log('Usage: file-toss <file-name>');
    process.exit(1);
}

const absolutePath = path.resolve(filePath);

if (!fs.existsSync(absolutePath)) {
    console.log(`Error: Specified file not found! (${absolutePath})`);
    process.exit(1);
}

const fileName = path.basename(absolutePath);
const port = 3000;

// Start the local HTTP server
const server = http.createServer((req, res) => {
    // Check if request URL matches our file
    if (req.url.includes(encodeURIComponent(fileName))) {
        const stat = fs.statSync(absolutePath);

        // Headers for forced download
        res.writeHead(200, {
            'Content-Length': stat.size,
            'Content-Disposition': `attachment; filename="${fileName}"`
        });

        const readStream = fs.createReadStream(absolutePath);
        readStream.pipe(res);

        console.log(`\nDownload started from a remote device...`);
    } else {
        res.writeHead(404);
        res.end();
    }
});

// We are making the server listen, and using async/await for the tunnel
server.listen(port, '0.0.0.0', async () => {
    console.log(`\nLocal server started. Preparing public tunnel...`);

    try {
        // Create a public tunnel to our local port 3000
        const tunnel = await localtunnel({ port: port });
        const downloadUrl = `${tunnel.url}/${encodeURIComponent(fileName)}`;

        console.log(`\nWORLDWIDE TRANSFER ENABLED!`);
        console.log(`File ready for sharing: ${fileName}`);
        console.log(`Scan the QR code below from ANY network (Wi-Fi or Cellular):\n`);

        // Generates a large, readable QR code using the public URL
        qrcode.generate(downloadUrl);

        console.log(`\nPublic Link: ${downloadUrl}`);
        console.log(`To exit and close tunnel: Ctrl+C\n`);

        tunnel.on('close', () => {
            console.log('\nTunnel closed.');
        });

    } catch (error) {
        console.log(`\nTunnel error: ${error.message}`);
        console.log(`Could not create public link. Please try again later.`);
        process.exit(1);
    }
});