// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let rooms = {};

io.on('connection', (socket) => {
  socket.on('join room', (roomName) => {
    if (!rooms[roomName]) {
      rooms[roomName] = [];
    }

    if (rooms[roomName].length < 2) {
      rooms[roomName].push(socket.id);
      socket.join(roomName);
      socket.to(roomName).emit('user connected', socket.id);
    } else {
      socket.emit('room full');
    }
  });

  socket.on('disconnect', () => {
    for (const room in rooms) {
      if (rooms[room].includes(socket.id)) {
        rooms[room] = rooms[room].filter((id) => id !== socket.id);
        socket.to(room).emit('user disconnected', socket.id);
        break;
      }
    }
  });

  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', {
      from: socket.id,
      signal: data.signal,
    });
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
