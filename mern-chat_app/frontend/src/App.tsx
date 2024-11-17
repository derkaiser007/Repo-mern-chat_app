import React, { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface IMessage {
  sender: string;
  receiver: string;
  message: string;
  timestamp: Date;
}

const socket: Socket = io('http://localhost:5000');

const App: React.FC = () => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [receiver, setReceiver] = useState('');

  useEffect(() => {
    socket.on('receiveMessage', (newMessage: IMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    return () => {
      socket.off('receiveMessage');
    };
  }, []);

  const sendMessage = () => {
    if (message.trim() && username && receiver) {
      const newMessage = { sender: username, receiver, message };
      socket.emit('sendMessage', newMessage);
      setMessage('');
    }
  };

  return (
    <div>
      <h1>Chat App</h1>
      <div>
        <input
          type="text"
          placeholder="Your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="text"
          placeholder="Receiver's username"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
        />
      </div>
      <div>
        <ul>
          {messages.map((msg, index) => (
            <li key={index}>
              <strong>{msg.sender}</strong>: {msg.message} <em>{new Date(msg.timestamp).toLocaleString()}</em>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <input
          type="text"
          placeholder="Type your message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default App;
