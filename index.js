#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const qrcode = require('qrcode-terminal');
const localtunnel = require('localtunnel');

// Get arguments from the command line
const args = process.argv.slice(2);

// Check if the --public flag is provided
const isPublic = args.includes('--public');

// Treat the first argument not starting with '--' as the file path
const filePath = args.find(arg => !arg.startsWith('--'));

if (!filePath) {
    console.log('Error: Please specify a file path!');
    console.log('Usage: file-toss <file-name> [--public]');
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

// Function to find the local IP address
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Return the first IPv4 address that is not localhost
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

const localIp = getLocalIp();
const localUrl = `http://${localIp}:${port}/${encodeURIComponent(fileName)}`;

// Create the HTTP server
const server = http.createServer((req, res) => {
    // Check if the request URL includes our file name
    if (req.url.includes(encodeURIComponent(fileName))) {
        const stat = fs.statSync(absolutePath);

        // Set headers to force the browser to download the file
        res.writeHead(200, {
            'Content-Length': stat.size,
            'Content-Disposition': `attachment; filename="${fileName}"`
        });

        // Read the file and stream it to the response
        const readStream = fs.createReadStream(absolutePath);
        readStream.pipe(res);

        console.log(`\nDownload started...`);
    } else {
        // Return 404 for any other requests
        res.writeHead(404);
        res.end();
    }
});

// Start listening on the specified port
server.listen(port, '0.0.0.0', async () => {
    console.log(`\nLocal server started. File ready for sharing: ${fileName}`);
    console.log(`Local Link: ${localUrl}\n`);

    if (!isPublic) {
        // Generate QR code for the local network only
        console.log(`Scan the QR code below from your phone connected to the SAME Wi-Fi network:\n`);
        qrcode.generate(localUrl);
        console.log(`\nTip: To share over the internet (cellular), restart the command with the --public flag.`);
    } else {
        // Expose the local server to the world using localtunnel
        console.log(`Preparing public tunnel...\n`);
        try {
            const tunnel = await localtunnel({ port: port });
            const publicUrl = `${tunnel.url}/${encodeURIComponent(fileName)}`;

            console.log(`WORLDWIDE TRANSFER ENABLED!`);
            console.log(`Public Link: ${publicUrl}\n`);
            console.log(`Scan the QR code below from ANY network (Wi-Fi or Cellular):\n`);

            qrcode.generate(publicUrl);

            // Listen for the tunnel closing event
            tunnel.on('close', () => {
                console.log('\nTunnel closed.');
            });
        } catch (error) {
            // Fallback to local link if the tunnel fails
            console.log(`\nTunnel error: ${error.message}`);
            console.log(`Could not create public link. Falling back to local QR code:\n`);
            qrcode.generate(localUrl);
        }
    }

    console.log(`\nTo exit: Ctrl+C\n`);
});