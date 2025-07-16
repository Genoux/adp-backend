import supabaseQuery from './supabaseQuery';
import { Database } from '../types/supabase';

type Room = Database['public']['Tables']['rooms']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

export interface TurnUpdateTransaction {
  roomUpdate: {
    id: number;
    status: string;
    cycle: number;
  };
  activeTeamUpdate: {
    roomId: number;
    color: string;
    is_turn: boolean;
    can_select: boolean;
  };
  inactiveTeamUpdate: {
    roomId: number;
    color: string;
    is_turn: boolean;
  };
}

export const executeTurnUpdateTransaction = async (
  transaction: TurnUpdateTransaction
): Promise<void> => {
  const { roomUpdate, activeTeamUpdate, inactiveTeamUpdate } = transaction;
  
  try {
    // Execute all database operations in sequence
    // In a real implementation, you'd use Supabase's transaction support
    // For now, we'll do sequential operations with error handling
    
    // Update room status and cycle
    await supabaseQuery<Room[]>(
      'rooms',
      (q) => q.update({ 
        status: roomUpdate.status, 
        cycle: roomUpdate.cycle 
      }).eq('id', roomUpdate.id),
      'Error updating room in transaction'
    );

    // Update active team
    await supabaseQuery<Team[]>(
      'teams',
      (q) => q.update({ 
        is_turn: activeTeamUpdate.is_turn, 
        can_select: activeTeamUpdate.can_select 
      })
      .eq('room_id', activeTeamUpdate.roomId)
      .eq('color', activeTeamUpdate.color),
      'Error updating active team in transaction'
    );

    // Update inactive team
    await supabaseQuery<Team[]>(
      'teams',
      (q) => q.update({ 
        is_turn: inactiveTeamUpdate.is_turn 
      })
      .eq('room_id', inactiveTeamUpdate.roomId)
      .eq('color', inactiveTeamUpdate.color),
      'Error updating inactive team in transaction'
    );

    console.log(`Transaction completed successfully for room ${roomUpdate.id}`);
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error; // Re-throw to let caller handle the error
  }
};

export const executePhaseUpdateTransaction = async (
  roomId: number,
  newPhase: string,
  ready: boolean = true
): Promise<void> => {
  try {
    // Update room phase
    await supabaseQuery<Room[]>(
      'rooms',
      (q) => q.update({ 
        status: newPhase,
        ready: ready 
      }).eq('id', roomId),
      'Error updating room phase in transaction'
    );

    // Update all teams in room
    await supabaseQuery<Team[]>(
      'teams',
      (q) => q.update({ 
        can_select: false 
      }).eq('room_id', roomId),
      'Error updating teams in phase transaction'
    );

    console.log(`Phase update transaction completed for room ${roomId}`);
  } catch (error) {
    console.error('Phase update transaction failed:', error);
    throw error;
  }
};