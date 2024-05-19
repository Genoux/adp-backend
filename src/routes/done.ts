import { Router } from 'express';
import { setDonePhase } from '../utils/handlers/phaseHandler';

const router = Router();

router.post('/', async (req, res) => {
  const roomid = req.query.roomid as string;
  if (!roomid) {
    return res.status(400).send('roomid query parameter is required');
  }

  try {
    await setDonePhase(roomid);
    res.sendStatus(200); // Send a 200 status code (OK)
  } catch (error) {
    console.error('Error setting waiting phase:', error);
    res.sendStatus(500); // Send a 500 status code (Internal Server Error)
  }
});

export default router;
