const express = require('express');
const app = express();
const path = require('path');

const fs = require('fs');
const bodyParser = require('body-parser');

app.use(bodyParser.json());

const port = 3000;
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));