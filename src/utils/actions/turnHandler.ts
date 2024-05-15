import { Server } from 'socket.io';
import supabase from '../../supabase';
import RoomTimerManager from '../../services/RoomTimerManager';

type Phase = 'waiting' | 'planning' | 'ban' | 'select' | 'done';
type TeamColor = 'blue' | 'red';

interface Turn {
  phase: Phase;
  teamColor?: TeamColor; // Optional because not all phases need a team
  picks?: number; // Optional because not all phases involve picking
}

interface TeamData {
  id: number;
  isturn: boolean;
  nb_turn: number;
  clicked_hero: string | null;
  room: string;
  ready: boolean;
}

const turnSequence: Turn[] = [
  { phase: 'waiting' }, // 0
  { phase: 'planning' }, // 1
  // Ban Phase
  { phase: 'ban', teamColor: 'blue' }, // 2
  { phase: 'ban', teamColor: 'red' }, // 3
  { phase: 'ban', teamColor: 'blue' }, // 4
  { phase: 'ban', teamColor: 'red' }, // 5
  { phase: 'ban', teamColor: 'blue' }, // 6
  { phase: 'ban', teamColor: 'red' }, // 7
  // Pick Phase
  { phase: 'select', teamColor: 'blue', picks: 1 }, // 8
  { phase: 'select', teamColor: 'red', picks: 1 },  // 9
  { phase: 'select', teamColor: 'red', picks: 1 },  // 10
  { phase: 'select', teamColor: 'blue', picks: 1 }, // 11
  { phase: 'select', teamColor: 'blue', picks: 1 }, // 12
  { phase: 'select', teamColor: 'red', picks: 1 }, // 13 
  { phase: 'select', teamColor: 'red', picks: 1 },  // 14
  { phase: 'select', teamColor: 'blue', picks: 1 }, // 15
  { phase: 'select', teamColor: 'blue', picks: 1 },   // 16
  { phase: 'select', teamColor: 'red', picks: 1 },   // 17
  { phase: 'done' },
];

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const getCurrentCycleDefinition = (cycle: number): Turn => turnSequence[cycle];

export const nextTurn = async (roomId: string) => {
  const { data: room } = await supabase.from('rooms').select('cycle').eq('id', roomId).single();
  if (room) {
    await supabase
      .from('rooms')
      .update({ cycle: room.cycle + 1 })
      .eq('id', roomId)
  }

};

export const handlePhase = async (roomId: string, io: Server, roomTimerManager: RoomTimerManager) => {
  await supabase.from('teams').update({ isturn: false }).eq('room', roomId)
  const { data } = await supabase
    .from('rooms')
    .select('cycle, status')
    .eq('id', roomId)
    .single();

  if (!data) {
    console.error('Error fetching room cycle');
    return;
  }

  const cycleDefinition =  turnSequence[data.cycle];

  if (data.cycle >= 18) {
    await handleDonePhase(roomId, io, roomTimerManager);
    return;
  }

  switch (cycleDefinition.phase) {
    case 'waiting':
      await handleWaitingPhase(roomId, io, roomTimerManager);
      break;
    case 'planning':
      await handlePlanningPhase(roomId, io, roomTimerManager);
      break;
    case 'ban':
      await handleBanPhase(roomId, io, cycleDefinition.teamColor as TeamColor, data.cycle, roomTimerManager);
      break;
    case 'select':
      await handlePickPhase(roomId, io, cycleDefinition.teamColor as TeamColor, cycleDefinition.picks as number);
      break;
    // case 'done':
    //   await handleDonePhase(roomId, io, roomTimerManager);
    //   break;
    default:
      console.error('Unknown phase:', cycleDefinition.phase);
      break;
  }


  await supabase
    .from('rooms')
    .update({ status: cycleDefinition.phase })
    .eq('id', roomId)
};

const handleWaitingPhase = async (roomId: string, io: Server, roomTimerManager: RoomTimerManager) => {
  roomTimerManager.stopTimer(roomId);
  roomTimerManager.stopLobbyTimer(roomId);
  console.log('Waiting for all teams to be ready...');
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, ready')
    .eq('room', roomId);

  if (error) {
    console.error('Error fetching teams:', error);
    return;
  }

  if (teams.every((team) => team.ready)) {
    await nextTurn(roomId); // Increment cycle here
    await handlePhase(roomId, io, roomTimerManager);
  } else {
    console.log(`Room ${roomId} is still waiting for teams to be ready.`);
  }
};

const handlePlanningPhase = async (roomId: string, io: Server, roomTimerManager: RoomTimerManager) => {
  console.log('Planning phase started...');
  roomTimerManager.stopLobbyTimer(roomId);
  roomTimerManager.startLobbyTimer(roomId);
};

const handleBanPhase = async (roomId: string, io: Server, teamColor: TeamColor, cycle: number, roomTimerManager: RoomTimerManager) => {
  await supabase.from('teams').update({ isturn: true, nb_turn: 1 }).eq('room', roomId).eq('color', teamColor)
  roomTimerManager.startTimer(roomId);
  console.log(`${teamColor} is banning...`);
};

const handlePickPhase = async (roomId: string, io: Server, teamColor: TeamColor, picks: number) => {
  await supabase.from('teams').update({ isturn: true, nb_turn: 1 }).eq('room', roomId).eq('color', teamColor)
  console.log(`${teamColor} is picking ${picks} champions...`);
  //await nextTurn(roomId); // Increment cycle here
};

export const handleDonePhase = async (roomId: string, io: Server, roomTimerManager: RoomTimerManager) => {
  console.log('The game is done.');
  await supabase.from('teams').update({ isturn: false }).eq('room', roomId)
  roomTimerManager.stopTimer(roomId);
  await delay(3000); // Simulating done delay
  await supabase
    .from('rooms')
    .update({ status: 'done' })
    .eq('id', roomId);
  console.log(`Room ${roomId} status updated to done.`);
};