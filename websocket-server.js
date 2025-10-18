const WebSocket = require('ws');
const OpenAI = require('openai');
const http = require('http');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store active OpenAI WebSocket connections
const openaiConnections = new Map();
const clientConnections = new Map();

// Handle client WebSocket connections
wss.on('connection', (clientWs, request) => {
  console.log('🔌 New client connected');
  
  clientWs.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received from client:', data.type);
      
      if (data.type === 'create_session') {
        await handleCreateSession(clientWs, data);
      } else if (data.type === 'audio_data') {
        await handleAudioData(clientWs, data);
      } else if (data.type === 'start_listening') {
        await handleStartListening(clientWs, data);
      } else if (data.type === 'stop_listening') {
        await handleStopListening(clientWs, data);
      }
    } catch (error) {
      console.error('❌ Error handling client message:', error);
      clientWs.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });
  
  clientWs.on('close', () => {
    console.log('🔌 Client disconnected');
    // Clean up OpenAI connection if exists
    const sessionId = clientConnections.get(clientWs);
    if (sessionId && openaiConnections.has(sessionId)) {
      openaiConnections.get(sessionId).close();
      openaiConnections.delete(sessionId);
    }
    clientConnections.delete(clientWs);
  });
});

async function handleCreateSession(clientWs, data) {
  try {
    console.log('🔑 Creating OpenAI Realtime session...');
    
    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy',
      instructions: `You are a professional AI receptionist for ${data.businessName || 'CloudGreet'}. Be helpful, friendly, and professional. When the user connects, immediately greet them warmly and ask how you can help. Keep responses concise and natural for voice conversation.`,
      modalities: ['text', 'audio'],
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 200
      }
    });

    const sessionId = session.id;
    const clientSecret = session.client_secret;
    
    console.log('✅ OpenAI session created:', sessionId);
    
    // Create WebSocket connection to OpenAI
    const openaiWsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&session_id=${sessionId}&client_secret=${clientSecret}`;
    
    const openaiWs = new WebSocket(openaiWsUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1',
        'User-Agent': 'CloudGreet/1.0'
      }
    });
    
    openaiWs.on('open', () => {
      console.log('✅ Connected to OpenAI Realtime API');
      
      // Send session configuration
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are a professional AI receptionist for ${data.businessName || 'CloudGreet'}. Be helpful, friendly, and professional. When the user connects, immediately greet them warmly and ask how you can help. Keep responses concise and natural for voice conversation.`,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 200
          }
        }
      };
      
      openaiWs.send(JSON.stringify(sessionConfig));
      console.log('🔐 Sent session configuration to OpenAI');
      
      // Send greeting message
      const greetingMessage = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Hello, I just connected to the voice system.'
            }
          ]
        }
      };
      
      openaiWs.send(JSON.stringify(greetingMessage));
      console.log('🎤 Sent greeting message to OpenAI');
      
      // Store connections
      openaiConnections.set(sessionId, openaiWs);
      clientConnections.set(clientWs, sessionId);
      
      // Send success to client
      clientWs.send(JSON.stringify({
        type: 'session_created',
        sessionId: sessionId,
        message: 'Session created successfully'
      }));
    });
    
    openaiWs.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('📨 Received from OpenAI:', data.type);
        
        // Forward OpenAI messages to client
        clientWs.send(JSON.stringify(data));
        
        if (data.type === 'error') {
          console.error('❌ OpenAI error:', data.error);
        }
      } catch (error) {
        console.error('❌ Error parsing OpenAI message:', error);
      }
    });
    
    openaiWs.on('error', (error) => {
      console.error('❌ OpenAI WebSocket error:', error);
      clientWs.send(JSON.stringify({
        type: 'error',
        error: 'OpenAI connection error: ' + error.message
      }));
    });
    
    openaiWs.on('close', (code, reason) => {
      console.log('🔌 OpenAI WebSocket closed:', code, reason.toString());
      openaiConnections.delete(sessionId);
      clientConnections.delete(clientWs);
      clientWs.send(JSON.stringify({
        type: 'openai_disconnected',
        code: code,
        reason: reason.toString()
      }));
    });
    
  } catch (error) {
    console.error('❌ Error creating session:', error);
    clientWs.send(JSON.stringify({
      type: 'error',
      error: 'Session creation failed: ' + error.message
    }));
  }
}

async function handleAudioData(clientWs, data) {
  const sessionId = clientConnections.get(clientWs);
  if (!sessionId || !openaiConnections.has(sessionId)) {
    clientWs.send(JSON.stringify({
      type: 'error',
      error: 'No active session'
    }));
    return;
  }
  
  const openaiWs = openaiConnections.get(sessionId);
  if (openaiWs.readyState === WebSocket.OPEN) {
    // Send audio data to OpenAI
    const audioMessage = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_audio_buffer',
            audio: data.audioData
          }
        ]
      }
    };
    
    openaiWs.send(JSON.stringify(audioMessage));
    console.log('🎤 Sent audio data to OpenAI');
  }
}

async function handleStartListening(clientWs, data) {
  const sessionId = clientConnections.get(clientWs);
  if (!sessionId || !openaiConnections.has(sessionId)) {
    clientWs.send(JSON.stringify({
      type: 'error',
      error: 'No active session'
    }));
    return;
  }
  
  console.log('🎤 Starting listening for session:', sessionId);
  clientWs.send(JSON.stringify({
    type: 'listening_started',
    message: 'Started listening'
  }));
}

async function handleStopListening(clientWs, data) {
  const sessionId = clientConnections.get(clientWs);
  if (!sessionId || !openaiConnections.has(sessionId)) {
    clientWs.send(JSON.stringify({
      type: 'error',
      error: 'No active session'
    }));
    return;
  }
  
  console.log('🔇 Stopping listening for session:', sessionId);
  clientWs.send(JSON.stringify({
    type: 'listening_stopped',
    message: 'Stopped listening'
  }));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});

module.exports = { app, server, wss };
