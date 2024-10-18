const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuração da OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use a variável de ambiente
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(ws, { id: clientId });

  ws.send(JSON.stringify({ type: 'connected', clientId }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
    
      if (data.type === 'chat') {
        try {
          const response = await getAIResponse(data.message);
          ws.send(JSON.stringify({ type: 'chat', senderId: 'AI', message: response }));
        } catch (error) {
          console.error('Erro ao obter resposta da IA:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Desculpe, ocorreu um erro ao processar sua mensagem.' }));
        }
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

async function getAIResponse(message) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: "Você é um assistente de suporte ao cliente útil e amigável." },
      { role: "user", content: message }
    ],
    model: "gpt-3.5-turbo",
  });

  return completion.choices[0].message.content;
}

server.listen(3000, () => {
  console.log('Servidor de suporte AI rodando na porta 3000');
});