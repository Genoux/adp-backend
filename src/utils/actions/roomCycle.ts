// import RoomTimerManager from '../../services/RoomTimerManager';
// import supabase from '../../supabase';

// const RoomStatus = {
//   BAN: 'ban',
//   SELECT: 'select',
//   DONE: 'done',
// };

// const DEFAULT_CYCLE = 0;

// export async function updateRoomCycle(roomId: string): Promise<number> {
//   try {
//     const roomTimerManager = RoomTimerManager.getInstance();

//     // Fetch the current room cycle and status
//     const { data: room, error: fetchError } = await supabase
//       .from('rooms')
//       .select('cycle, status')
//       .eq('id', roomId)
//       .single();

//     if (fetchError || !room) {
//       console.error('Error fetching room:', fetchError);
//       return DEFAULT_CYCLE;
//     }

//     if (room.status === RoomStatus.DONE) {
//       roomTimerManager.deleteTimer(roomId);
//       return DEFAULT_CYCLE;
//     }

//     // Calculate new cycle and status
//     const newCycle = room.cycle + 1;
//     const newStatus = determineNewStatus(newCycle, room.status);

//     // Update the room cycle and status
//     const { error: updateError } = await supabase
//       .from('rooms')
//       .update({ cycle: newCycle, status: newStatus })
//       .eq('id', roomId);

//     if (updateError) {
//       console.error('Error updating room:', updateError);
//       return room.cycle || DEFAULT_CYCLE;
//     }

//     return newCycle;
//   } catch (error) {
//     console.error('Unexpected error in updateRoomCycle:', error);
//     return DEFAULT_CYCLE;
//   }
// }

// /**
//  * Determine the new status based on the cycle number.
//  * @param {number} cycle - The current cycle number.
//  * @param {string} currentStatus - The current status of the room.
//  * @returns {string} - The new status.
//  */
// function determineNewStatus(cycle: number, currentStatus: string): string {
//   if (cycle === 1) {
//     return RoomStatus.BAN;
//   } else if (cycle === 7) {
//     return RoomStatus.SELECT;
//   }
//   return currentStatus;
// }
