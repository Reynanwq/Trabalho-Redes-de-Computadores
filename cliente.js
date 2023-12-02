//O módulo socket.io-client tem o objetivo de criar um cliente que se conecta ao servidor usando WebSocket. 
const { io } = require("socket.io-client");
//O modulo readline é utilizado para ler entrada do terminal de forma assíncrona.
const readline = require("readline");
//Cria uma instância do cliente socket.io que se conecta ao servidor na URL
const socket = io("http://localhost:3000");

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
        socket.emit('command', input);

        // Limpa o prompt e exibe novamente
        rl.prompt();
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
