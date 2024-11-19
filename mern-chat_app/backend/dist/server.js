"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const Message_1 = __importDefault(require("./models/Message"));
dotenv_1.default.config();
(0, db_1.default)();
// app is your Express application, which handles routing, middleware, and any HTTP requests.
const app = (0, express_1.default)();
// The http.createServer(app) wraps it in an HTTP server, allowing you to extend its capabilities.
// Socket.IO needs direct access to the underlying HTTP server for WebSocket functionality. 
// This is why you use http.createServer(app) rather than just relying on app.listen.
const server = http_1.default.createServer(app);
// It sets up a Socket.IO server instance and configures it to work with the server created using 
// http.createServer(app). This initializes a new Socket.IO server and attaches it to the existing HTTP server (server).
// By doing this, the HTTP server can handle WebSocket connections in addition to regular HTTP requests.
// While CORS primarily applies to HTTP requests, WebSocket connections follow similar rules. If the frontend 
// (running on http://localhost:3000) tries to connect to the backend on a different domain or port 
// (e.g., http://localhost:5000), the browser enforces CORS rules.
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// The event is triggered when a new client connects to the server. The socket object represents the connected 
// client and allows communication between the server and the client.
io.on('connection', (socket) => {
    const users = new Map(); // { socket.id: userId }
    socket.on('register', (userId) => {
        users.set(socket.id, userId);
    });
    console.log(`User connected: ${socket.id}`);
    // Listens for a sendMessage event emitted by the client.
    socket.on('sendMessage', (_a) => __awaiter(void 0, [_a], void 0, function* ({ sender, receiver, message }) {
        if (!sender || !receiver || !message) {
            return socket.emit('error', 'Invalid message data');
        }
        try {
            // A new Message instance is created using the received data. 
            const newMessage = new Message_1.default({ sender, receiver, message });
            // Message is saved to the database using Mongoose (await newMessage.save()).
            yield newMessage.save();
            // The io.emit broadcasts the saved message to all connected clients (including the sender).
            io.emit('receiveMessage', newMessage);
        }
        catch (error) {
            console.error(`Error saving message from ${sender} to ${receiver}:`, error);
            // io.emit targets all clients connected to the server, including the sender.
            // socket.emit targets the specific client (socket) that initiated the connection or event.
            socket.emit('error', 'Failed to send message');
        }
    }));
    socket.on('disconnect', () => {
        const userId = users.get(socket.id);
        console.log(`User ${userId} disconnected: ${socket.id}`);
        // Removing the user from active sessions or rooms.
        users.delete(socket.id);
        // Notify other users.
        socket.broadcast.emit('userDisconnected', { userId });
    });
});
const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
