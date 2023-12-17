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
        if (command !== "help" && command !== "deposit" && command !== "recover" &&
            command !== "delete" && command !== "list") {
            console.log("Please enter a valid command! If unsure, enter command help.")
            rl.prompt();
            return;
        }
        if (command === 'help') {
            console.log(`\nCOMMANDS:\n 
deposit - syntax: deposit username filename \nuploads a file to the server.\n
recover - syntax: recover username filename savepath \ndownloads a file from the server in the given local filepath.\n
delete - syntax: delete username filename \ndeletes a file from the server.\n
list - syntax: list username \nlists the avaliable files to download for that username. \n
help - shows this help.\n`);
            rl.prompt();
        } else if (command === 'recover') {
            const clientFilePath = path.join(__dirname, DIRECTORY, message[2]);
            // Verifica se o arquivo existe dentro da pasta /client/
            if (!fs.existsSync(clientFilePath)) {
                socket.emit('message', `File ${message[2]} not found in /client/`);
                return;
            }

            if (message[2]) {

                const stream = ss.createStream();
                ss(socket).emit('recoverfile', stream, {
                    clientName: message[1],
                    filename: message[2]
                });
                //caminho onde o arquivo será salvo

                const filename = message[2];
                const filePath = path.join(DIRECTORY, message[3]);
                //verifica se o diretorio existe, se não: é criado de forma recursiva
                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(DIRECTORY, { recursive: true });
                }
                stream.pipe(fs.createWriteStream(filePath));
                stream.on("end", () => {
                    setTimeout(() => rl.prompt(), 100);
                })
            } else {
                console.log("Please enter all arguments! If unsure, use command help.");
                rl.prompt();
            }
        } else if (command === 'deposit') {
            if (message[2]) {
                const filePath = path.join(path.join(DIRECTORY, message[2]));
                if (fs.existsSync(filePath)) {
                    const stream = ss.createStream();
                    ss(socket).emit('depositfile', stream, {
                        clientName: message[1],
                        filename: message[2]
                    });
                    fs.createReadStream(filePath).pipe(stream)
                    stream.on("end", () => {
                        setTimeout(() => rl.prompt(), 100);
                    });
                } else {
                    console.log("File not found!")
                    rl.prompt();
                }


            } else console.log("Please write all arguments! If unsure, use command help.");
        } else {
            socket.emit('command', input);
            rl.prompt();
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