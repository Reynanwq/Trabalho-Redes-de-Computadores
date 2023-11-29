const { io } = require("socket.io-client");
const readline = require("readline");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log(`Connected to server with ID: ${socket.id}`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.setPrompt('Enter a command (e.g., list client1): ');
    rl.prompt();

    rl.on('line', (input) => {
        // Envia o comando digitado pelo usuário para o servidor
        socket.emit('command', input);

        // Limpa o prompt e exibe novamente
        rl.prompt();
    });

    rl.on('close', () => {
        console.log("[CLIENT] Disconnected from server");
        process.exit(0);
    });
});

socket.on("message", (message) => {
    console.log(`[SERVER] ${message}`);
});