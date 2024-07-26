import sleep from '../helpers/sleep';
import supabase from '../supabase';
import { setPlanningPhase } from '../utils/handlers/phaseHandler';
import { Router } from 'express';

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
    await supabase.from('teams').update({ ready: true }).eq('room_id', parsedRoomid);
    await supabase.from('rooms').update({ ready: true }).eq('id', parsedRoomid);

    await setPlanningPhase(parsedRoomid);
    res.sendStatus(200); // Send a 200 status code (OK)
  } catch (error) {
    console.error(error);
    res.sendStatus(500); // Send a 500 status code (Internal Server Error)
  }
});

export default router;
