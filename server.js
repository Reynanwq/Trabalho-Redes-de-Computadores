const path = require('path');
const net = require('net');
const fs = require('fs');
const PORT = 3000;
const DIRECTORY = './server/';
const SERVER = 'localhost';
const HEADER = 1024;
const { Server } = require("socket.io");
const io = new Server();

// Mapeia os clientes conectados ao servidor1
const clients = new Map();

io.on('connection', (socket) => {
    console.log(`[SERVER] Client connected: ${socket.id}`);

    // Adiciona o cliente ao mapa de clientes usando o ID do socket como chave
    clients.set(socket.id, socket);

    socket.on('command', (data) => {
        const message = data.toString().trim().split(' ');
        const command = message[0];
        const args = message.slice(1);

        if (command === 'list') {
            list(socket, args[0]);
        } else if (command === 'deposit') {
            deposit(socket, args[0], parseInt(args[1]), args[2], args[3]);
        } else if (command === 'recover') {
            recover(socket, args[0], args[1]);
        } else if (command === 'delete') {
            deleteFile(socket, args[0], args[1]);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[SERVER] Client disconnected: ${socket.id}`);
        // Remove o cliente do mapa de clientes ao desconectar
        clients.delete(socket.id);
    });
});

/*
-----------------------------------------------------------------

                FUNÇÃO PARA RECUPERAR ARQUIVOS

-----------------------------------------------------------------
*/
function recover(socket, clientName, filename) {}





/*
-----------------------------------------------------------------

                FUNÇÃO PARA DELETAR ARQUIVOS

-----------------------------------------------------------------
 */

function deleteFile(client, clientName, filename) {}



/*
-----------------------------------------------------------------

                FUNÇÃO PARA DEPOSITAR ARQUIVOS

-----------------------------------------------------------------
*/

function deposit(socket, clientName, copies, filename, fileContent) {
    for (let i = 0; i < copies; i++) {
        const clientPath = path.join(DIRECTORY, `${i}`, clientName);

        if (!fs.existsSync(clientPath)) {
            fs.mkdirSync(clientPath, { recursive: true });
        }

        const filePath = path.join(clientPath, filename);
        fs.writeFileSync(filePath, fileContent);
    }

    socket.emit('message', `File ${filename} deposited`);
}

/* 
-----------------------------------------------------------------

                FUNÇÃO PARA LISTAR ARQUIVOS

-----------------------------------------------------------------
*/

function list(socket, clientName) {
    const clientPath = path.join(DIRECTORY, clientName);

    if (!fs.existsSync(clientPath)) {
        socket.emit('message', `No files found for ${clientName}`);
        return;
    }

    const clientFiles = fs.readdirSync(clientPath);

    if (clientFiles.length > 0) {
        socket.emit('message', `Files for ${clientName}: ${clientFiles.join(',')}`);
    } else {
        socket.emit('message', `No files found for ${clientName}`);
    }
}

io.listen(PORT);
console.log(`[SERVER] Server is now actively monitoring Port: ${PORT}`);
