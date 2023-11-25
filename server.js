const path = require('path');
const net = require('net');
const fs = require('fs');
const PORT = 3000;
const DIRECTORY = './server/';
const SERVER = 'localhost';
const HEADER = 1024;

/* Importações:
- net: funcionalidades para criar servidores e clientes TCP.
- fs: interação com sistemas de arquivos, incluindo leitura, escrita e exclusão de arquivos.
- path: utilitários para manipular caminhos de arquivos e diretórios. */


/*
- depósito de arquivos
- recuperação de arquivos
- remoção de arquivos

IDEIA DE FUNÇÕES:

- Listar arquivos disponíveis para um cliente.
- Permitir que um cliente deposite um arquivo no servirdor.
- Permitir que o cliente recupere um arquivo do servidor.
- Permite que o cliente exclua um arquivo do servidor.
*/

const server = net.createServer((client) => {
    console.log(`Server is running. Accepted connection at address: ${client.remoteAddress}:${client.remotePort}`);

    client.on('data', (data) => {
        const message = data.toString().trim().split(' ');
        const command = message[0];
        const args = message.slice(1);

        if (command === 'list') {
            // Implementação da função list
        } else if (command === 'deposit') {
            deposit(client, args[0], parseInt(args[1]), args[2], args[3]);
        } else if (command === 'recover') {
            // Implementação da função recover
        } else if (command === 'delete') {
            // Implementação da função delete
        }
    });

    client.on('end', () => {
        console.log(`Connection closed by client: ${client.remoteAddress}:${client.remotePort}`);
    });
});

/* 
-----------------------------------------------------------------

                FUNÇÃO PARA LISTAR ARQUIVOS

-----------------------------------------------------------------
- Cria o caminho completo para o diretório do cliente.
- Verifica se o diretório do cliente existe.
- Se o diretório não existir, envia uma mensagem informando que nenhum arquivo foi encontrado.
-  Lê os arquivos no diretório do cliente.
- Se houver arquivos, envia uma mensagem listando os arquivos para o cliente.
- Se não houver arquivos, envia uma mensagem informando que nenhum arquivo foi encontrado.
*/
function list(client, clientName) {
    const clientPath = path.join(DIRECTORY, clientName);

    if (!fs.existsSync(clientPath)) {
        client.write(`No files found for ${clientName}\n`);
        return;
    }

    const clientFiles = fs.readdirSync(clientPath);

    if (clientFiles.length > 0) {
        client.write(`Files for ${clientName}: ${clientFiles.join(',')}\n`);
    } else {
        client.write(`No files found for ${clientName}\n`);
    }
}




/*
-----------------------------------------------------------------

                FUNÇÃO PARA RECUPERAR ARQUIVOS

-----------------------------------------------------------------
*/
function recover()  {}





/*
-----------------------------------------------------------------

                FUNÇÃO PARA DELETAR ARQUIVOS

-----------------------------------------------------------------
 */
function deleteFile() {}





/*
-----------------------------------------------------------------

                FUNÇÃO PARA DEPOSITAR ARQUIVOS

-----------------------------------------------------------------

EXPLICAÇÃO:
- Itera sobre o número de cópias especificado pelo cliente.
- Cria o caminho para o diretório do cliente e a cópia específica.
- Verifica se o diretório do cliente existe, senão, o cria de forma recursiva.
- Cria o caminho completo do arquivo no diretório do cliente.
- Escreve o conteúdo do arquivo no caminho especificado.
- Envia uma mensagem de sucesso de volta para o cliente.
*/
function deposit(client, clientName, copies, filename, fileContent) {
    for (let i = 0; i < copies; i++) {
        const clientPath = path.join(DIRECTORY, `${i}`, clientName);

        if (!fs.existsSync(clientPath)) {
            fs.mkdirSync(clientPath, { recursive: true });
        }

        const filePath = path.join(clientPath, filename);
        fs.writeFileSync(filePath, fileContent);
    }

    client.write(`File ${filename} deposited\n`);
}

server.listen(PORT, SERVER, () => {
    console.log(`Server is now actively monitoring Port: ${PORT}, IP: ${SERVER}`);
});