import { Router } from 'express';
import { setWaitingPhase } from '../utils/handlers/phaseHandler';
import supabase from '../supabase';

const router = Router();

router.post('/', async (req, res) => {
  const roomid = req.query.roomid as string;
  console.log("router.post - roomid:", roomid);
  if (!roomid) {
    return res.status(400).send('roomid query parameter is required');
  }

  try {
    await setWaitingPhase(roomid);
    await supabase.from('teams').update({ ready: false }).eq('room', roomid);
    res.sendStatus(200); // Send a 200 status code (OK)
  } catch (error) {
    console.error('Error setting waiting phase:', error);
    res.sendStatus(500); // Send a 500 status code (Internal Server Error)
  }
});

export default router;
