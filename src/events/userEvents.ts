import { Server, Socket } from "socket.io";
import supabase from "../supabase";
import selectChampion from "../utils/champions";
import { updateRoomCycle } from "../utils/roomCycle";
import { switchTurn } from "../utils/switchTeam";
import { RoomTimerManager } from '../services/RoomTimerManager';
import { assignNumberOfTurn } from "../utils/teanNumberOfTurn";

export const handleUserEvents = (socket: Socket, io: Server) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on("SELECT_CHAMPION", async ({ teamid, roomid, selectedChampion }) => {
    if (roomTimerManager.isTimeUp(roomid)) {
      console.log('Cannot select champion, time is up.');
      return;
    }
    roomTimerManager.lockRoomTimer(roomid);

    await selectChampion(teamid, roomid, selectedChampion);
    handleTurn(roomid, io, socket);

  });

  async function handleTurn(roomid: string, io: Server, socket: Socket) {
    const cycle = await updateRoomCycle(roomid);
    const switchTurnResult = await switchTurn(roomid, cycle);

    if (!switchTurnResult) {
      socket.emit("CHAMPION_SELECTED", switchTurnResult);
    }

    await assignNumberOfTurn(cycle, roomid)

    roomTimerManager.cancelTargetAchieved(roomid);
    roomTimerManager.resetTimer(roomid);
    roomTimerManager.unlockRoomTimer(roomid);
    socket.to(roomid).emit("TIMER_RESET", true);
  }

  socket.on("RESET_TIMER", ({ roomid }) => {
    roomTimerManager.resetTimer(roomid);
  });

  socket.on("STOP_TIMER", ({ roomid }) => {
    roomTimerManager.stopTimer(roomid);
  });

  socket.on("START_TIMER", ({ roomid }) => {
    roomTimerManager.startTimer(roomid);
  });

  socket.on("TEAM_READY", async ({ roomid, teamid }) => {
    const { data: teams } = await supabase
      .from("teams")
      .select("*")
      .eq("room", roomid);

    if (!teams) return;

    console.log(`Team ${teamid} is ready!`);

    if (teams.every((team) => team.ready)) {
      await supabase.from("rooms").update({ ready: true, status: 'planning' }).eq("id", roomid);
      console.log(`Room ${roomid} is ready!`);
      await updateRoomCycle(roomid);
      roomTimerManager.startLobbyTimer(roomid);
    }
  });
};