//O módulo socket.io-client tem o objetivo de criar um cliente que se conecta ao servidor usando WebSocket. 
require('dotenv').config()
const { io } = require("socket.io-client");
//O modulo readline é utilizado para ler entrada do terminal de forma assíncrona.
const readline = require("readline");
//Cria uma instância do cliente socket.io que se conecta ao servidor na URL
const socket = io(`http://${process.env.SERVER}:${process.env.PORT}`);
const ss = require('socket.io-stream');
const fs = require('fs');
const path = require('path');
const DIRECTORY = process.env.CLIENTDIRECTORY;

//É acionado quando a conexão com o servidor é estabelecida.
socket.on("connect", () => {
    console.log(`Connected to server with ID: ${socket.id}`);

    //interface para ler a entrada do usuario a partir do terminal
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.setPrompt('Enter a command: ');
    rl.prompt();

    //evento acionado após o usuário pressionar "Enter após digitar um comando"
    rl.on('line', (input) => {
        // Envia o comando digitado pelo usuário para o servidor
        const message = input.toString().trim().split(' ');
        const command = message[0];
        if (command === 'help') {
            console.log(`\nCOMMANDS:\n 
deposit - syntax: deposit username filename \nuploads a file to the server.\n
recover - syntax: recover username filename savepath \ndownloads a file from the server in the given local filepath.\n
delete - syntax: delete username filename \ndeletes a file from the server.\n
list - syntax: list username \nlists the avaliable files to download for that username. \n
help - shows this help.\n`)
        } else if (command === 'recover') {
            if (message[3]) {
                const stream = ss.createStream();
                ss(socket).emit('recoverfile', stream, {
                    clientName: message[1],
                    filename: message[2]
                });
                // caminho onde o arquivo será salvo
                const filePath = path.join(path.join(DIRECTORY, message[3]), message[2]);
                // verifica se o diretório existe, se não: é criado de forma recursiva
                if (!fs.existsSync(path.join(DIRECTORY, message[3]))) {
                    fs.mkdirSync(path.join(DIRECTORY, message[3]), { recursive: true });
                }

                const fileWriteStream = fs.createWriteStream(filePath);

                // Recebe o tamanho do arquivo do servidor
                ss(socket).on('recoverfile', function(stream, data) {
                    const fileSize = parseInt(data, 10);
                    stream.pipe(fileWriteStream);

                    // Monitora o progresso do download
                    let receivedSize = 0;
                    stream.on('data', (chunk) => {
                        receivedSize += chunk.length;
                        const progress = (receivedSize / fileSize) * 100;
                        process.stdout.clearLine();
                        process.stdout.cursorTo(0);
                        process.stdout.write(`Downloading: ${progress.toFixed(2)}%`);
                    });

                    // Quando o download é concluído
                    stream.on('end', () => {
                        process.stdout.write('\n');
                        console.log(`[CLIENT] File ${message[2]} recovered to ${filePath}`);
                        rl.prompt();
                    });
                });
            } else {
                console.log("Please write all arguments!");
            }
        } else if (command === 'deposit') {
            if (message[2]) {
                if (!fs.existsSync(message[2])) {
                    console.log("File not found")
                } else {
                    const filePath = path.join(path.join(DIRECTORY, message[2]));
                    if (fs.existsSync(filePath)) {
                        const stream = ss.createStream();
                        ss(socket).emit('depositfile', stream, {
                            clientName: message[1],
                            filename: message[2]
                        });
                        fs.createReadStream(filePath).pipe(stream).on("end", () => {
                            rl.prompt();
                        });
                    } else {
                        console.log("File not found!")
                    }
                }

            } else console.log("Please write all arguments! If unsure, use command help");
        } else {
            socket.emit('command', input);
        }

        // Limpa o prompt e exibe novamente
    });

    //o evento "close" é acionado após o usuario fechar o terminal (ctrl + c)
    rl.on('close', () => {
        console.log("[CLIENT] Disconnected from server");
        process.exit(0);
    });
});

//servodor enviando mensagem para o cliente, através do evento "message"
socket.on("message", (message) => {
    console.log(`[SERVER] ${message}`);
});