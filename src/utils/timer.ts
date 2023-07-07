import { Timer } from "easytimer.js";
import { Server, Socket } from 'socket.io';
import { selectUserChampion } from "./champions";
import { updateRoomCycle } from "./roomCycle";
import { switchTurn } from "./switchTeam";
import supabase from "../supabase";
import { RoomTimerManager } from '../services/RoomTimerManager';

// Getting the instance of the RoomTimerManager
const roomTimerManager = RoomTimerManager.getInstance();

export async function cleanUpRoomTimers() {
  const { data: rooms } = await supabase.from('rooms').select('id');
  if (!rooms) return;

  const validRoomIds = new Set(rooms.map(room => room.id));

  for (const roomId in roomTimerManager.listTimers()) {
    if (!validRoomIds.has(roomId)) {
      console.log(`Deleting timer for room ${roomId}`);
      roomTimerManager.deleteTimer(roomId);
    }
  }
}

// Initialize timer
export function initTimer(roomid: string, io: Server, socket: Socket) {
  if (roomTimerManager.hasTimer(roomid)) return;

  roomTimerManager.initTimer(roomid, io, socket);
}

