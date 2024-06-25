import supabase from '../supabase';
import { setPlanningPhase } from '../utils/handlers/phaseHandler';
import { Router } from 'express';

const router = Router();

router.post('/', async (req, res) => {
  const roomid = req.query.roomid as string;
  if (!roomid) {
    return res.status(400).send('roomid query parameter is required');
  }

  try {
    await setPlanningPhase(roomid);
    await supabase.from('teams').update({ ready: true }).eq('room', roomid);
    await supabase.from('rooms').update({ ready: true }).eq('id', roomid);
    res.sendStatus(200); // Send a 200 status code (OK)
  } catch (error) {
    console.error('Error setting waiting phase:', error);
    res.sendStatus(500); // Send a 500 status code (Internal Server Error)
  }
});

export default router;
