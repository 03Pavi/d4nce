const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      if (pathname === '/a') {
        await app.render(req, res, '/a', query);
      } else if (pathname === '/b') {
        await app.render(req, res, '/b', query);
      } else {
        await handle(req, res, parsedUrl);
      }
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-room', async (roomId, userId, userName) => {
      console.log(`User ${userId} (${userName}) joining room ${roomId}`);
      socket.join(roomId);
      
      // Get all other users in the room
      const sockets = await io.in(roomId).fetchSockets();
      const existingUsers = sockets
        .filter(s => s.id !== socket.id) // Exclude self
        .map(s => ({
          userId: s.data.userId,
          userName: s.data.userName
        }))
        .filter(u => u.userId); // Filter out sockets without data

      // Send existing users to the new client
      socket.emit('existing-users', existingUsers);

      // Store user data on the socket for future reference
      socket.data.userId = userId;
      socket.data.userName = userName;

      // Broadcast to others in the room that a user connected
      socket.to(roomId).emit('user-connected', userId, userName);

      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);
        socket.to(roomId).emit('user-disconnected', userId);
      });
      
      socket.on('send-message', (message) => {
          io.to(roomId).emit('receive-message', message);
      });
    });

    socket.on('join-personal-room', (userId) => {
      console.log(`User ${userId} joined personal room`);
      socket.join(userId);
    });

    // Community Chat Events
    socket.on('join-community-chat', ({ communityId, userId }) => {
      console.log(`User ${userId} joined community chat ${communityId}`);
      socket.join(`community-${communityId}`);
      socket.data.communityId = communityId;
      socket.data.userId = userId;
    });

    socket.on('send-community-message', ({ communityId, message }) => {
      console.log(`Message sent to community ${communityId}`);
      // Broadcast to all users in the community except sender
      socket.to(`community-${communityId}`).emit('new-community-message', message);
    });

    socket.on('initiate-call', ({ roomId, callerId, callerName, communityName, receiverIds }) => {
      console.log(`Call initiated by ${callerId} in room ${roomId} for users:`, receiverIds);
      
      receiverIds.forEach(receiverId => {
        io.to(receiverId).emit('incoming-call', {
          roomId,
          callerId,
          callerName,
          communityName
        });
      });
    });
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
