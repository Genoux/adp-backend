import cronstrue from 'cronstrue';
import { subHours } from 'date-fns';
import * as cron from 'node-cron';
import supabaseQuery from '../helpers/supabaseQuery';
import RoomTimerManager from '../services/RoomTimerManager';
import { Database } from '../types/supabase';
import { parseExpression } from 'cron-parser';

const ROOM_AGE_LIMIT = 24;

type Room = Database['public']['Tables']['rooms']['Row'];

export async function cleanupOldRooms() {
  const cutoffTime = subHours(new Date(), ROOM_AGE_LIMIT);
  try {
    const oldRooms = await supabaseQuery<Room[]>(
      'rooms',
      (q) => q.select('id').lt('created_at', cutoffTime.toISOString()),
      'Error fetching old rooms'
    );

    if (!oldRooms || oldRooms.length === 0) {
      console.log('No old rooms to clean up');
      return;
    }

    console.log(`Found ${oldRooms.length} old rooms to clean up`);

    for (const room of oldRooms) {
      try {
        await supabaseQuery('teams', (q) => q.delete().eq('room_id', room.id), 'Error deleting teams');
        await supabaseQuery('rooms', (q) => q.delete().eq('id', room.id), 'Error deleting room');
        console.log(`Deleted room ${room.id} and associated teams from database`);
      } catch (error) {
        console.error(`Error cleaning up room ${room.id}:`, error);
      }
    }

    console.log('Room cleanup completed');
  } catch (error) {
    console.error('Error in cleanupOldRooms:', error);
  }
}

let cronJob: cron.ScheduledTask | null = null;

export function startRoomCleanupService() {
  const cronExpression = '0 0 * * *'; // Run at midnight every day
  cron.schedule(cronExpression, async () => {
    console.log('Running scheduled room cleanup');
    await cleanupOldRooms();
  });

  const interval = parseExpression(cronExpression);
  console.log(`Room cleanup service started. Next run: ${interval.next().toString()}`);
}

export function stopRoomCleanupService() {
  if (cronJob) {
    cronJob.stop();
    console.log('Room cleanup service stopped');
  }
}
