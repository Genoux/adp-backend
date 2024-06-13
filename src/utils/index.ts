import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';
import { pickChampion } from './actions/pickChampion';
import { banChampion } from './actions/banChampion';
import { updateTurn } from './handlers/draftHandler';
import type { Socket } from 'socket.io';

const EndActionTrigger = async (roomID: string, roomTimerManager: RoomTimerManager, userTrigger?: boolean, socket?: Socket) => {
  await supabase.from('teams').update({ canSelect: false }).eq('room', roomID);

  roomTimerManager.cancelTargetAchieved(roomID);

  if (roomTimerManager.isLocked(roomID)) {
    console.log('Room is locked');
    return;
  }

  roomTimerManager.lockRoom(roomID);
  roomTimerManager.stopTimer(roomID);

  try {
    const { data, error } = await supabase
      .rpc('get_active_team_with_room', { room_id_param: roomID })
 
    if (error) {
      console.error('Error in handleSelectChampion:', error);
      if (socket) {
        socket.emit('err', error);
      }
      return error;
    }

    const activeTeam = data[0]

    switch (activeTeam.status) {
      case 'ban':
        await banChampion(activeTeam, userTrigger);
        break;
      case 'select':
        await pickChampion(activeTeam);
        break;
      default:
        // Do nothing
        break;
    }

   // await supabase.from('teams').update({ clicked_hero: null }).eq('id', activeTeam.team_id);
    await supabase.from('teams').update({ clicked_hero: null }).eq('room', roomID);

    const turn = await updateTurn(activeTeam);
    roomTimerManager.unlockRoom(roomID);

    if (turn) {
      const otherColor = turn.teamColor === 'blue' ? 'red' : 'blue';
      
      await supabase.from('teams').update({ isturn: false }).eq('color', otherColor);
      await supabase
        .from('teams')
        .update({ isturn: true, canSelect: true })
        .eq('room', roomID)
        .eq('color', turn.teamColor);

      roomTimerManager.startTimer(roomID);
      roomTimerManager.resetTimer(roomID);
    }
  } catch (error) {
    console.error('Error in EndActionTrigger:', error);
  }
};

export { EndActionTrigger };
