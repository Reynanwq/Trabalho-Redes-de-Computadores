const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log(`Connected to server with ID: ${socket.id}`);
    socket.emit('command', 'deposit client1 2 test.txt Hello, World!');
    socket.emit('command', 'list client1');
    socket.emit('command', 'recover client1 test.txt');
    socket.emit('command', 'delete client1 test.txt');
});

socket.on("message", (message) => {
    console.log(`[CLIENT] ${message}`);
});

socket.on("disconnect", () => {
    console.log("[CLIENT] Disconnected from server");
});