import supabase from "../supabase";

export async function switchTurn(roomId: string, roomCycle: number): Promise<boolean | string> {
  if (!roomCycle) {
      console.error("Room cycle not available");
      return false;
  }

  const teams = await fetchTeams(roomId);
  if (!teams) return "No teams found";

  const currentTeam = teams.find(team => team.isturn);
  if (!currentTeam) {
      console.error("No team currently has the turn");
      return false;
  }

  const shouldSwitch = await shouldSwitchTurn(currentTeam, roomCycle);
  if (!shouldSwitch) return false;

  if (shouldSwitch === "done") {
      await setRoomStatusToDone(roomId);
      return "done";
  }

  await toggleTeamsTurn(teams);
  await assignNumberOfTurn(roomCycle + 1, roomId);

  return true;
}


async function fetchTeams(roomId: string) {
    const { data: teams, error } = await supabase.from("teams").select("*").eq("room", roomId);
    if (error || !teams || teams.length === 0) {
        console.error("Error fetching teams or no teams found:", error);
        return null;
    }
    return teams;
}


async function shouldSwitchTurn(team: any, cycle: number): Promise<boolean | "done"> {
  if (cycle >= 16) return "done";  // Game is done if cycle is 16 or more
  if (team.nb_turn > 0) return false; // If the current team still has turns left, don't switch
  return true;  // Switch turns by default if the current team has no turns left
}

async function setRoomStatusToDone(roomId: string) {
    await supabase.from("rooms").update({ status: "done" }).eq("id", roomId);
    await supabase.from("teams").update({ isturn: false }).eq("room", roomId);
}

async function toggleTeamsTurn(teams: any[]) {
    const updatePromises = teams.map(team => 
        supabase.from("teams").update({ isturn: !team.isturn, clicked_hero: null }).eq("id", team.id)
    );
    await Promise.all(updatePromises);
}

async function assignNumberOfTurn(cycle: number, roomId: string) {
    const nb_turn = determineNumberOfTurns(cycle);

    const { error } = await supabase
        .from("teams")
        .update({ nb_turn })
        .eq("room", roomId)
        .eq("isturn", true);

    if (error) {
        console.error('Error updating number of turns:', error);
    }
}

function determineNumberOfTurns(cycle: number): number {
    const doublePickCycle = [8, 9, 10, 12, 14];
    return doublePickCycle.includes(cycle) ? 2 : 1;
}
