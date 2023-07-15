import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { handleRoomEvents } from './events/roomEvents';
import { handleUserEvents } from './events/userEvents';
import  userAction from './utils/champions';
import cors from 'cors';

export const startServer = () => {
  const app = express();
  
  app.use(cors({
    origin: '*', // Accept all origins
    credentials: true,
  })); 

  const server = createServer(app);
  
  const io = new Server(server, {
    cors: {
      origin: '*', // Accept all origins
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    handleRoomEvents(socket, io);
    handleUserEvents(socket, io);
  });

  // Handle the root route
  app.get('/', (req, res) => {
    res.sendStatus(200);  // Send a 200 status code (OK)
  });

  app.post('/utility', async (req, res) => {
    try {
      const result = userAction('337', 'Sona')
     // const result = await selectUserChampion('305', null); // Assuming your utility function is async
      res.status(200).json(result); // Return the result of your function
    } catch (error) {
      res.status(500).json({ error: 'There was an error.' }); // Error handling
    }
  });

  server.listen(process.env.PORT || 4000, async() => {
    console.log(`Listening on port ${process.env.PORT || 4000}`);
  });
};
