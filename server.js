/*Importando módulo,definindo porta do servidor e diretório onde os arquivos serãoo armazenados*/
require('dotenv').config()
const path = require('path');
const net = require('net');
const fs = require('fs');
const ss = require('socket.io-stream');
const SERVER = process.env.SERVER;
let PORT = parseInt(process.env.PORT);
const DIRECTORY = process.env.DIRECTORY;

//const HEADER = 1024;
const { Server } = require("socket.io");
const io = new Server();
const ioClient = require("socket.io-client")
const mirrorlist = []
const mirrornames = process.env.MIRRORS.split(" ")

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
          console.log({url: mirrornames[i], id: socket.id })
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
      if (args[0]) list(socket, args[0]); else socket.write("Please write all arguments!")
    } else if (command === 'delete') {
      if (args[2]) deleteFile(socket, args[0], args[1]); else socket.write("Please write all arguments!");
    } else if (command === 'addmirror') {
      if (args[0]) addMirror(socket.id, io, args[0]); else socket.write("Please write all arguments!");
    }

  });

  ss(socket).on('recoverfile', function(stream, data) {
    recover(socket, stream, data.clientName, data.filename) //função para recuperar arquivos
  });

  ss(socket).on('depositfile', function(stream, data) {
    deposit(socket, stream, data.clientName, data.filename)
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
          console.log({url: mirror, id: socketID })
          for (let i = 0; i < mirrorlist.length; i++) {
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
    if (folder !== clientName) return;
    const folderPath = path.join(DIRECTORY, folder);
    const folderFiles = fs.readdirSync(folderPath);
    // console.log(folderPath);
    // verifica se o diretório do cliente existe dentro do destino de copia

      const clientFiles = fs.readdirSync(folderPath);

      //verifica se o arquivo existe no diretório
      if (clientFiles.includes(filename)) {
        const filePath = path.join(folderPath, filename);
        

         if (fs.existsSync(filePath)) {
           fileFound = true; 
            fs.createReadStream(filePath).pipe(stream);
             stream.on("end", () => {
              //mensagem citando que o arquivo foi recuperado com sucesso.
              client.write(`File ${filename} recovered\n`);
              console.log(`[SERVER] File ${filename} recovered to ${client.id}`)
              if (!mirror) createBackup(mirrorlist, clientName, filename, filePath)
              //cria multiplas copias do arquivo para o cliente em diferentes servidores
            });
          
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
function deposit(client, stream, clientName, filename,  mirror = false) {
  //caminho onde o arquivo será depositado
  console.log("mirror")
  const clientPath = path.join(DIRECTORY, clientName);
  const filePath = path.join(clientPath, filename);
  //verifica se o diretorio existe, se não: é criado de forma recursiva
  if (!fs.existsSync(clientPath)) {
    fs.mkdirSync(clientPath, { recursive: true });
  }
  stream.pipe(fs.createWriteStream(filePath));
  stream.on("end", () => {
     //mensagem citando que o arquivo foi depositado com sucesso.
  client.write(`File ${filename} deposited`);
  console.log(`[SERVER] File ${filename} received from ${client.id}`)
  if (!mirror) createBackup(mirrorlist, clientName, filename, filePath)
  //cria multiplas copias do arquivo para o cliente em diferentes servidores

  })
   
  
}

/*-----------------------------------------------------------------

                FUNÇÃO PARA CRIAR BACKUP DE ARQUIVOS

-----------------------------------------------------------------*/

function createBackup(mirrorlist, clientName, filename, filePath) {
  for (let i = 0; i < mirrorlist.length; i++) {
    for (let socketid in io.sockets.sockets) {
      const socket = io.sockets.sockets.get(socketid);
      console.log(socket);
      const stream = ss.createStream();
      ss(socket).emit('depositfile', stream, {clientName: clientName,
      filename: filename});
      stream.pipe(fs.createWriteStream(filePath));


    }
    

  }

}

/*-----------------------------------------------------------------

                FUNÇÃO PARA DELETAR BACKUP DE ARQUIVOS

-----------------------------------------------------------------*/

function deleteBackup(mirrorlist, clientName, filename, fileContent) {
  for (let i = 0; i < mirrorlist.length(); i++) {
    for (let socketid in io.sockets.sockets) {
      io.in(mirrorlist[i].id).emit('message', 'delete clientName filename')
    }
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
