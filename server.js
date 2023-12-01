/*Importando módulo,definindo porta do servidor e diretório onde os arquivos serãoo armazenados*/
const path = require('path');
const net = require('net');
const fs = require('fs');
const PORT = 3000;
const DIRECTORY = './server/';
const SERVER = 'localhost';
const HEADER = 1024;
const { Server } = require("socket.io");
const io = new Server();

// Mapeia os clientes conectados ao servidor
const clients = new Map();


//acionado após o cliente se concectar ao servidor
io.on('connection', (socket) => {
    //ao se conectar ao servidor usando o Socket.IO, é atribuido um ID pelo servidor ao cliente.
    console.log(`[SERVER] Client connected: ${socket.id}`);
    // Adiciona o cliente ao mapa de clientes usando o ID do socket como chave
    clients.set(socket.id, socket);

    //acionado após o cliente emitir um comando para o servidor
    socket.on('command', (data) => {
        //aqui o comando é dividido em partes: comando,nome do cliente, n° de cópias, nome do arquivo e conteudo do arquivo
        const message = data.toString().trim().split(' ');
        const command = message[0];
        const args = message.slice(1);

        //verifica qual comando o usuario escolheu e envia para as funções responsáveis
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

    //acionado após o cliente se desconectar do servidor
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
function recover(client, clientName, filename) {
    let fileFound = false;

    //lendo os diretórios dentro do /server/
    const directories = fs.readdirSync(DIRECTORY);

    //itera sobre os diretórios para cada copia
    directories.forEach((folder) => {
        const folderPath = path.join(DIRECTORY, folder);
        const folderFiles = fs.readdirSync(folderPath);

        //verifica se o diretório do cliente existe dentro do destino de copia
        if (folderFiles.includes(clientName)) {
            const clientPath = path.join(folderPath, clientName);
            const clientFiles = fs.readdirSync(clientPath);

            //verifica se o arquivo existe no diretório
            if (clientFiles.includes(filename)) {
                const filePath = path.join(clientPath, filename);
                const fileContent = fs.readFileSync(filePath);

                //converte o tamanho do arquivo de bytes para string
                const fileSize = Buffer.from(fileContent).length.toString();
                //envia para o cliente o tamanho do arquivo 
                client.write(`${fileSize}\n`);
                //envia para o cliente o conteudo do arquivo
                client.write(fileContent);
                fileFound = true;
            }
        }
    });

    //caso não encontrado, envia mensagem para o cliente
    if (!fileFound) {
        client.write(`[WARNING] File ${filename} not found\n`);
    }
}

/* ----------------------------------------------------------------

                FUNÇÃO PARA DELETAR ARQUIVOS

-----------------------------------------------------------------*/
function deleteFile(client, clientName, filename) {
    let fileDeleted = false;

    //lendo os diretórios dentro do /server/
    const directories = fs.readdirSync(DIRECTORY);

    //itera sobre os diretórios para cada copia
    directories.forEach((folder) => {
        const folderPath = path.join(DIRECTORY, folder);
        const folderFiles = fs.readdirSync(folderPath);

        //verifica se o diretório do cliente existe dentro do destino de copia
        if (folderFiles.includes(clientName)) {
            const clientPath = path.join(folderPath, clientName);
            //lendo os arquivo do ditetório do cliente
            const clientFiles = fs.readdirSync(clientPath);

            //verifica se o arquivo existe no diretório
            if (clientFiles.includes(filename)) {
                const filePath = path.join(clientPath, filename);
                //elimina o arquivo
                fs.unlinkSync(filePath);
                fileDeleted = true;
            }
        }
    });
    //mensagem indicando se foi deletado ou não
    if (fileDeleted) {
        client.write(`[SUCESS] File ${filename} deleted\n`);
    } else {
        client.write(`[WARNING] File ${filename} not found\n`);
    }
}




/*-----------------------------------------------------------------

                FUNÇÃO PARA DEPOSITAR ARQUIVOS

-----------------------------------------------------------------*/

//recebe como parâmetro o cliente,quanntidade de copias, nome do arquivo e o conteudo.
function deposit(socket, clientName, copies, filename, fileContent) {
    //cria multiplas copias do arquivo para o cliente em diferentes diretórios
    for (let i = 0; i < copies; i++) {
        //caminho onde o arquivo será depositado
        const clientPath = path.join(DIRECTORY, `${i}`, clientName);
        //verifica se o diretorio existe, se não: é criado de forma recursiva
        if (!fs.existsSync(clientPath)) {
            fs.mkdirSync(clientPath, { recursive: true });
        }
        const filePath = path.join(clientPath, filename);
        fs.writeFileSync(filePath, fileContent);
    }

    //mensagem citando que o arquivo foi depositado com sucesso.
    socket.emit('message', `File ${filename} deposited`);
}

/*-----------------------------------------------------------------

                FUNÇÃO PARA LISTAR ARQUIVOS

-----------------------------------------------------------------*/

//recebe apenas o nome do cliente como par^metro
function list(socket, clientName) {
    const clientPath = path.join(DIRECTORY, clientName);

    //verifica se o diretório existe
    if (!fs.existsSync(clientPath)) {
        socket.emit('message', `No files found for ${clientName}`);
        return;
    }

    const clientFiles = fs.readdirSync(clientPath);

    //verifica se há arquivos no diretório
    if (clientFiles.length > 0) {
        socket.emit('message', `Files for ${clientName}: ${clientFiles.join(',')}`);
    } else {
        socket.emit('message', `No files found for ${clientName}`);
    }
}

//inicia o servidor na porta=3000 exibindo uma mensagem indicando que o servidor está ativo.
io.listen(PORT);
console.log(`[SERVER] Server is now actively monitoring Port: ${PORT}`);