import { Router } from 'express';
import RoomTimerManager from '../services/RoomTimerManager';
import finishTurn from '../utils/actions/finishTurn';

const router = Router();

router.post('/', async (req, res) => {
  const roomid = req.query.roomID as string;
  if (!roomid) {
    return res.status(400).send('roomid query parameter is required');
  }

  const parsedRoomid = parseInt(roomid, 10);
  if (isNaN(parsedRoomid)) {
    return res.status(400).send('roomid must be a valid number');
  }

  try {
    await finishTurn(parsedRoomid, RoomTimerManager.getInstance());
    res.sendStatus(200); // Send a 200 status code (OK)
  } catch (error) {
    console.error('Error setting waiting phase:', error);
    res.sendStatus(500); // Send a 500 status code (Internal Server Error)
  }
});

export default router;
