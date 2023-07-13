import { Socket, Server } from "socket.io";
//import { initTimer, startTimer} from '../utils/timer';
import supabase from "../supabase";
import { RoomTimerManager } from "../services/RoomTimerManager";

export const handleRoomEvents = (socket: Socket, io: Server) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on("joinRoom", async ({ roomid, teamid }) => {
    console.log("socket.on - roomid:", roomid);

    socket.join(roomid);
    
    console.dir(`User ${socket.id} joined room ${roomid} as Team ${teamid}`);

    socket.emit("message", `Welcome to room ${roomid}, Team ${teamid}!`);

    roomTimerManager.initTimer(roomid, io, socket);

    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomid)
      .single();
    if (room && room.ready && room.status !== "done" && room.cycle !== 0) {
      roomTimerManager.startTimer(roomid);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
  });
};
