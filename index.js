#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const qrcode = require('qrcode-terminal');

// Get the file path entered from the terminal
const filePath = process.argv[2];

if (!filePath) {
    console.log('Error: Please specify a file path!');
    console.log('Usage: ftoss <file-name>');
    process.exit(1);
}

// Get the absolute path of the file
const absolutePath = path.resolve(filePath);

// Check if the file actually exists
if (!fs.existsSync(absolutePath)) {
    console.log(`Error: Specified file not found! (${absolutePath})`);
    process.exit(1);
}

const fileName = path.basename(absolutePath);
const port = 3000;

// Function to get the computer's local network (Wi-Fi) IP address
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Get the first IPv4 address that is not localhost
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

const localIp = getLocalIp();
const localUrl = `http://${localIp}:${port}/${encodeURIComponent(fileName)}`;

// Create the local HTTP server
const server = http.createServer((req, res) => {
    // If the incoming request includes our file name
    if (req.url.includes(encodeURIComponent(fileName))) {
        const stat = fs.statSync(absolutePath);

        // Set headers to force download
        res.writeHead(200, {
            'Content-Length': stat.size,
            'Content-Disposition': `attachment; filename="${fileName}"`
        });

        // Read the file and send it as a response stream
        const readStream = fs.createReadStream(absolutePath);
        readStream.pipe(res);

        console.log(`\nDownload started...`);

        // Auto-close feature: Shut down the server when transfer is complete
        readStream.on('end', () => {
            console.log(`\nDownload complete! Shutting down server...`);
            // Wait 1 second to ensure the final bytes are sent before closing
            setTimeout(() => {
                process.exit(0);
            }, 1000);
        });

    } else {
        res.writeHead(404);
        res.end();
    }
});

// Start listening on the port
server.listen(port, '0.0.0.0', () => {
    console.log(`\nLocal server started. File ready for sharing: ${fileName}`);
    console.log(`Local Link: ${localUrl}\n`);

    console.log(`IMPORTANT: Your phone and computer MUST be on the same Wi-Fi network!`);
    console.log(`Scan the QR code below to download:\n`);

    // Generate the QR code in the terminal
    qrcode.generate(localUrl);

    console.log(`\nServer will automatically close when the download is complete. (Or press Ctrl+C to cancel)\n`);
});