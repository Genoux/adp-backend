import { Server, Socket } from "socket.io";
import supabase from "../supabase";
import { selectUserChampion } from "../utils/champions";
import { updateRoomCycle } from "../utils/roomCycle";
import { switchTurn } from "../utils/switchTeam";
// import {
//   resetTimer,
//   startLobbyTimer,
//   stopTimer,
//   lockRoomTimer, unlockRoomTimer, cancelServerSelection
// } from "../utils/timer";

import { RoomTimerManager } from '../services/RoomTimerManager';

export const handleUserEvents = (socket: Socket, io: Server) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on("SELECT_CHAMPION", async ({ roomid, selectedChampion }) => {
    //cancelServerSelection(roomid);

    if (roomTimerManager.isTimeUp(roomid)) {
      console.log('Cannot select champion, time is up.');
      return;
    }
    roomTimerManager.lockRoomTimer(roomid);
  
    await selectUserChampion(roomid, selectedChampion);
    io.to(roomid).emit(
      "message",
      `User ${socket.id} has selected ${selectedChampion}`
    );
    
    const cycle = await updateRoomCycle(roomid);
    if (!await switchTurn(roomid, cycle)) {
      socket.emit("CHAMPION_SELECTED", true);
    }
  
    roomTimerManager.resetTimer(roomid);
    roomTimerManager.unlockRoomTimer(roomid);
    
    socket.to(roomid).emit("TIMER_RESET", true);
  });

  socket.on("RESET_TIMER", ({ roomid }) => {
    roomTimerManager.resetTimer(roomid);
  });

  socket.on("STOP_TIMER", ({ roomid }) => {
    roomTimerManager.stopTimer(roomid);
  });

  socket.on("TEAM_READY", async ({ roomid, teamid }) => {
    const { data: teams } = await supabase
      .from("teams")
      .select("*")
      .eq("room", roomid);

    if (!teams) return;

    console.log(`Team ${teamid} is ready!`);

    if (teams.every((team) => team.ready)) {
      await supabase.from("rooms").update({ ready: true }).eq("id", roomid);
      console.log(`Room ${roomid} is ready!`);
      await updateRoomCycle(roomid);
      roomTimerManager.startLobbyTimer(roomid);
    }
  });
};