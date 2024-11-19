import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import Message from './models/Message';

dotenv.config();
connectDB();

// app is your Express application, which handles routing, middleware, and any HTTP requests.
const app = express(); 
// The http.createServer(app) wraps it in an HTTP server, allowing you to extend its capabilities.
// Socket.IO needs direct access to the underlying HTTP server for WebSocket functionality. 
// This is why you use http.createServer(app) rather than just relying on app.listen.
const server = http.createServer(app);
// It sets up a Socket.IO server instance and configures it to work with the server created using 
// http.createServer(app). This initializes a new Socket.IO server and attaches it to the existing HTTP server (server).
// By doing this, the HTTP server can handle WebSocket connections in addition to regular HTTP requests.
// While CORS primarily applies to HTTP requests, WebSocket connections follow similar rules. If the frontend 
// (running on http://localhost:3000) tries to connect to the backend on a different domain or port 
// (e.g., http://localhost:5000), the browser enforces CORS rules.
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// The event is triggered when a new client connects to the server. The socket object represents the connected 
// client and allows communication between the server and the client.
io.on('connection', (socket) => {
  const users = new Map(); // { socket.id: userId }
  socket.on('register', (userId) => {
    users.set(socket.id, userId);
  });
  console.log(`User connected: ${socket.id}`);

  // Listens for a sendMessage event emitted by the client.
  socket.on('sendMessage', async ({ sender, receiver, message }) => {
    if (!sender || !receiver || !message) {
      return socket.emit('error', 'Invalid message data');
    }
    try {
      // A new Message instance is created using the received data. 
      const newMessage = new Message({ sender, receiver, message });
      // Message is saved to the database using Mongoose (await newMessage.save()).
      await newMessage.save();
      // The io.emit broadcasts the saved message to all connected clients (including the sender).
      io.emit('receiveMessage', newMessage);
    } catch (error) {
      console.error(`Error saving message from ${sender} to ${receiver}:`, error);
      // io.emit targets all clients connected to the server, including the sender.
      // socket.emit targets the specific client (socket) that initiated the connection or event.
      socket.emit('error', 'Failed to send message');
    }
  });

  socket.on('disconnect', () => {
    const userId = users.get(socket.id);
    console.log(`User ${userId} disconnected: ${socket.id}`);
    // Removing the user from active sessions or rooms.
    users.delete(socket.id);  
    // Notify other users.
    socket.broadcast.emit('userDisconnected', { userId });
  });
});

const PORT = process.env.PORT!;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
