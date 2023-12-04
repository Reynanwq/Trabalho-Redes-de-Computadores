/*Importando módulo,definindo porta do servidor e diretório onde os arquivos serãoo armazenados*/
const path = require('path');
const net = require('net');
const fs = require('fs');
const ss = require('socket.io-stream');
const SERVER = 'localhost';
let PORT = 3000;
const DIRECTORY = './server/';

const HEADER = 1024;
const { Server } = require("socket.io");
const io = new Server();
const ioClient = require("socket.io-client")
const mirrorlist = []
const mirrornames = ["http://localhost:3000"]

function refreshMirrors() {
  for (let i = 0; i < mirrorlist.length; i++) {
        
  }
}

const createServer = function(currentPort) {
  console.log(`Attempting to create server on port ${currentPort}...`)
  const server = net.createServer().listen(currentPort);

  server.on('listening', function() {

    PORT = server.address().port;
    server.close();
    console.log(`Server is listening to port ${PORT}`)
    for (let i = 0; i < mirrornames.length; i++) {
        if (mirrornames[i] !== `http://${SERVER}:${PORT}`) { 
        const socket = ioClient(`${mirrornames[i]}`);
        //Adiciona mirrors para enviar e receber cópias.
        socket.on("connect", () => {
          console.log(`[SERVER] Connected to mirror ${mirrornames[i]} with ID: ${socket.id}`);  
          mirrorlist.push({url: mirrornames[i], id: socket.id });
          socket.emit('command', `addmirror http://${SERVER}:${PORT}`);
        });
        }
      }
      
    io.listen(PORT);


  });


  server.on('error', function(error) {

    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${currentPort} is in use`);
      createServer(currentPort + 1);
      server.close();
    } 

  });

}


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
      deposit(socket, args[0], args[1], args[2]);
    } else if (command === 'delete') {
      deleteFile(socket, args[0], args[1]);
    } else if (command === 'addmirror') {
      addMirror(socket.id, io, args[0])
    } else if (command === "log")
      console.log(args[0]) 
  });

  ss(socket).on('recoverfile', function(stream, data) {
    recover(client, stream, data.clientName, data.filename)
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

                FUNÇÃO PARA ADICIONAR ESPELHO

-----------------------------------------------------------------
*/

function addMirror(socketID, io, mirror) {
  if (!mirrornames.includes(mirror) && mirror !== `http://${SERVER}:${PORT}`) { 
    mirrorlist.push({url: mirror, id: socketID });
    const socket = ioClient(mirror); 
        //Adiciona mirrors para enviar e receber cópias.
        socket.on("connect", () => {
          mirrornames.push(mirror);
          console.log(`[SERVER] Connected to mirror ${mirror} with ID: ${socket.id}`);  
          socket.emit('command', `addmirror http://${SERVER}:${PORT}`);
          for (let i = 0; i < mirrorlist.length; i++) {
            console.log(mirrorlist[i])
            socket.emit('command', `addmirror ${mirrorlist[i].url}`);
          
         }

        });
  }
  
}

/*
-----------------------------------------------------------------

                FUNÇÃO PARA RECUPERAR ARQUIVOS

-----------------------------------------------------------------
*/
function recover(client, stream, clientName, filename, mirror = false) {
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
        // const fileContent = fs.readFileSync(filePath);

        //converte o tamanho do arquivo de bytes para string
        //const fileSize = Buffer.from(fileContent).length.toString();
        //envia para o cliente o tamanho do arquivo 
        //client.write(`${fileSize}\n`);
        //envia para o cliente o conteudo do arquivo

        stream.pipe(fs.createWriteStream(filePath));

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
function deleteFile(client, clientName, filename, mirror = false) {
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

  if (!mirror) deleteBackup(mirrorlist, client, clientName)

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

//recebe como parâmetro o cliente, nome do arquivo e o conteudo.
function deposit(socket, clientName, filename, fileContent, mirror = false) {
  //caminho onde o arquivo será depositado
  const clientPath = path.join(path.join(DIRECTORY, PORT), filename);
  //verifica se o diretorio existe, se não: é criado de forma recursiva
  if (!fs.existsSync(clientPath)) {
    fs.mkdirSync(clientPath, { recursive: true });
  }
  const filePath = path.join(clientPath, filename);
  fs.writeFileSync(filePath, fileContent);
  if (!mirror) createBackup(mirrorlist, clientName, filename, fileContent)

  //mensagem citando que o arquivo foi depositado com sucesso.
  socket.emit('message', `File ${filename} deposited`); 
  //cria multiplas copias do arquivo para o cliente em diferentes servidores

}

/*-----------------------------------------------------------------

                FUNÇÃO PARA CRIAR BACKUP DE ARQUIVOS

-----------------------------------------------------------------*/

function createBackup(mirrorlist, clientName, filename, fileContent) {
  for (let i = 0; i < mirrorlist.length(); i++) {

    io.in(mirrorlist[i].id).emit('message', 'deposit clientName filename fileContent')

  }

}

/*-----------------------------------------------------------------

                FUNÇÃO PARA DELETAR BACKUP DE ARQUIVOS

-----------------------------------------------------------------*/

function deleteBackup(mirrorlist, clientName, filename, fileContent) {
  for (let i = 0; i < mirrorlist.length(); i++) {

    const socket = io(`${mirrorlist[i]}`);
    //É acionado quando a conexão com o servidor é estabelecida.
    socket.on("connect", () => {
      console.log(`Connected to server with ID: ${socket.id}`);  
      socket.emit('command', `delete ${clientName} ${filename} mirror`);

    });

  }

}

/*-----------------------------------------------------------------

                FUNÇÃO PARA LISTAR ARQUIVOS

-----------------------------------------------------------------*/

//recebe apenas o nome do cliente como parâmetro
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

createServer(PORT)
//inicia o servidor na porta selecionada exibindo uma mensagem indicando que o servidor está ativo.
//console.log(`[SERVER] Server is now actively monitoring Port: ${PORT}`);
