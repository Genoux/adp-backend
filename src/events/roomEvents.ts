import { Socket, Server } from "socket.io";
//import { initTimer, startTimer} from '../utils/timer';
import supabase from "../supabase";
import { RoomTimerManager } from "../services/RoomTimerManager";

export const handleRoomEvents = (socket: Socket, io: Server) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on("joinRoom", async ({ roomid, teamid }) => {
    socket.join(roomid);
    console.dir(`User ${socket.id} joined room ${roomid} as Team ${teamid}`);

    setTimeout(async () => {
      const { data: team } = await supabase.from("teams").select("socketid").eq("id", teamid).single();
      const existingSocketIds = team?.socketid ? JSON.parse(team.socketid) : [];
      const newSocketIds = JSON.stringify([...existingSocketIds, socket.id]);
      socket.data.teamid = teamid;
      await supabase.from("teams").update({ connected: true, socketid: newSocketIds }).eq("id", teamid);
    }, 1000);

    socket.emit("message", `Welcome to room ${roomid}, Team ${teamid}!`);

    roomTimerManager.initTimer(roomid, io, socket);

    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomid)
      .single();

    if (!room) {
      console.log("room not found")
      return
    }

    if (room.ready && room.status !== "done") {
      roomTimerManager.startTimer(roomid);
    }
  });

  socket.on("disconnect", async (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
    const teamid = socket.data.teamid;

    const { data: team } = await supabase.from("teams").select("socketid").eq("id", teamid).single();
    const existingSocketIds = team?.socketid ? JSON.parse(team.socketid) : [];

    const filteredSocketIds = existingSocketIds.filter((id: string) => id !== socket.id);
    const isConnected = filteredSocketIds.length > 0;
    const newSocketIds = JSON.stringify(filteredSocketIds);

    await supabase.from("teams").update({ connected: isConnected, socketid: newSocketIds }).eq("id", teamid);
  });
};
