import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 3000;

const server = createServer();

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: [ 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS' ],
    },
});

io.on('connection', (socket) => {
    console.log('Connected');

    socket.on('video', (data) => {
        // Broadcast the received video data to all connected clients
        io.emit('video-stream', data);
        console.log('Received and broadcasted video data');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Disconnected');
    });
});

server.listen(PORT, () => {
    console.log('Listening on port', PORT);
});

// Error handling
io.on('error', (error) => {
    console.error('Socket.IO error:', error);
});
