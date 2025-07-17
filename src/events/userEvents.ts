import { Socket } from 'socket.io';
import sleep from '../helpers/sleep';
import supabaseQuery from '../helpers/supabaseQuery';
import RoomTimerManager from '../services/RoomTimerManager';
import { Database } from '../types/supabase';
import finishTurn from '../utils/actions/finishTurn';
import { setPlanningPhase } from '../utils/handlers/phaseHandler';

type Team = Database['public']['Tables']['teams']['Row'];

// Debounce map to prevent rapid-fire selections
const debounceMap = new Map<number, number>();
const DEBOUNCE_DELAY = 1000; // 1 second

const handleUserEvents = (socket: Socket) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on('SELECT_CHAMPION', async ({ roomid }: { roomid: number }) => {
    if (!roomid) {
      console.log('Invalid roomid received');
      return;
    }

    // Debounce rapid selections
    const now = Date.now();
    const lastAction = debounceMap.get(roomid) || 0;
    
    if (now - lastAction < DEBOUNCE_DELAY) {
      console.log(`Debouncing SELECT_CHAMPION for room ${roomid}`);
      return;
    }
    
    debounceMap.set(roomid, now);

    // Cancel any pending timeout and process the turn
    roomTimerManager.cancelTargetAchieved(roomid);
    await finishTurn(roomid, roomTimerManager);
  });

  socket.on(
    'TEAM_READY',
    async ({ roomid, teamid }: { roomid: number; teamid: string }) => {
      try {
        const teams = await supabaseQuery<Team[]>(
          'teams',
          (q) => q.select('id, ready').eq('room_id', roomid),
          'Error fetching teams data in userEvents.ts'
        );

        console.log(teams);
        console.log(`Team ${teamid} is ready!`);

        if (teams.every((team: Team) => team.ready)) {
          await supabaseQuery(
            'rooms',
            (q) => q.update({ ready: true }).eq('id', roomid),
            'Error fetching rooms data'
          );

          console.log(`Room ${roomid} is ready!`);

          await sleep(1500);

          await setPlanningPhase(roomid);
        }
      } catch (error) {
        console.error('Error in handleTeamReady:', error);
      }
    }
  );
};

export default handleUserEvents;
