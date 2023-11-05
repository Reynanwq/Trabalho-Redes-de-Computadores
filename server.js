const net = require('net');
const fs = require('fs');
const path = require('path');

const HEADER = 1024;
const SERVER = 'localhost';
const PORT = 3000;
const DIRECTORY = './server/';

function listFiles(client, clientName) {
    const fileList = [];

    if (!fs.existsSync(DIRECTORY)) {
        fs.mkdirSync(DIRECTORY, { recursive: true });
    }

    const directories = fs.readdirSync(DIRECTORY);

    directories.forEach((folder) => {
        const folderPath = path.join(DIRECTORY, folder);
        const folderFiles = fs.readdirSync(folderPath);

        if (folderFiles.includes(clientName)) {
            const clientPath = path.join(folderPath, clientName);
            const clientFiles = fs.readdirSync(clientPath);

            clientFiles.forEach((file) => {
                fileList.push(file);
            });
        }
    });

    if (fileList.length > 0) {
        client.write(`Files to ${clientName} found: ${fileList.join(',')}\n`);
    } else {
        client.write(`No files to ${clientName} found\n`);
    }
}

function deposit(client, clientName, copies, filename, fileContent) {
    for (let i = 0; i < copies; i++) {
        const clientPath = path.join(DIRECTORY, `${i}`, clientName);

        if (!fs.existsSync(clientPath)) {
            fs.mkdirSync(clientPath, { recursive: true });
        }

        const filePath = path.join(clientPath, filename);
        fs.writeFileSync(filePath, fileContent);
    }

    client.write(`[SUCESS] File ${filename} created\n`);
}

function recover(client, clientName, filename) {
    let fileFound = false;

    const directories = fs.readdirSync(DIRECTORY);

    directories.forEach((folder) => {
        const folderPath = path.join(DIRECTORY, folder);
        const folderFiles = fs.readdirSync(folderPath);

        if (folderFiles.includes(clientName)) {
            const clientPath = path.join(folderPath, clientName);
            const clientFiles = fs.readdirSync(clientPath);

            if (clientFiles.includes(filename)) {
                const filePath = path.join(clientPath, filename);
                const fileContent = fs.readFileSync(filePath);

                const fileSize = Buffer.from(fileContent).length.toString();

                client.write(`${fileSize}\n`);
                client.write(fileContent);

                fileFound = true;
            }
        }
    });

    if (!fileFound) {
        client.write(`[WARNING] File ${filename} not found\n`);
    }
}

function deleteFile(client, clientName, filename) {
    let fileDeleted = false;

    const directories = fs.readdirSync(DIRECTORY);

    directories.forEach((folder) => {
        const folderPath = path.join(DIRECTORY, folder);
        const folderFiles = fs.readdirSync(folderPath);

        if (folderFiles.includes(clientName)) {
            const clientPath = path.join(folderPath, clientName);
            const clientFiles = fs.readdirSync(clientPath);

            if (clientFiles.includes(filename)) {
                const filePath = path.join(clientPath, filename);
                fs.unlinkSync(filePath);

                fileDeleted = true;
            }
        }
    });

    if (fileDeleted) {
        client.write(`[SUCESS] File ${filename} deleted\n`);
    } else {
        client.write(`[WARNING] File ${filename} not found\n`);
    }
}

const server = net.createServer((client) => {
    console.log(`[START] server is running. Accepted connection at address: ${client.remoteAddress}:${client.remotePort}`);

    client.on('data', (data) => {
        const message = data.toString().trim().split(' ');
        const command = message[0];
        const args = message.slice(1);

        if (command === 'LIST') {
            listFiles(client, args[0]);
        } else if (command === 'DEPOSIT') {
            deposit(client, args[0], parseInt(args[1]), args[2], args[3]);
        } else if (command === 'RECOVER') {
            recover(client, args[0], args[1]);
        } else if (command === 'DELETE') {
            deleteFile(client, args[0], args[1]);
        }
    });

    client.on('end', () => {
        console.log(`[END] Connection closed by client: ${client.remoteAddress}:${client.remotePort}`);
    });
});

server.listen(PORT, SERVER, () => {
    console.log(`[LISTENING] server is listening on IP: ${SERVER}, Port: ${PORT}`);
});