import supabase from "../supabase";

export async function switchTurn(roomId: string, roomCycle: number) {
  if (!roomCycle) {
    console.error("Room cycle not available");
    return;
  }

  const { data: teams, error: teamFetchError } = await supabase
    .from("teams")
    .select("*")
    .eq("room", roomId);

  if (teamFetchError || !teams || teams.length === 0) {
    console.error("Error fetching teams or no teams found:", teamFetchError);
    return "No teams found";
  }

  //resetTimer(roomId);

  const value = shouldSwitchTurn(roomCycle);

  if (!value) {
    return false;
  } else if (value === "done") {
    // set room status to done
    await supabase.from("rooms").update({ status: "done" }).eq("id", roomId);

    await supabase.from("teams").update({ isturn: false }).eq("room", roomId);

    return "done";
  }

  const updatePromises = teams.map((team: any) =>
    supabase.from("teams").update({ isturn: !team.isturn, clicked_hero: null }).eq("id", team.id)
  );

  await Promise.all(updatePromises);

  return true;
}

//TODO: ADD BANNING CYCLE 1-B 2-R 3-B 4-R 5-B 6-R, then regula cycle so B-7 R-8 R-9 B-10 B-11 R-12 R-13 B-14 B-15 R-16
function shouldSwitchTurn(cycle: number) {
  const switchTurns = [1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 15];

  if (switchTurns.includes(cycle)) {
    return true; // Switch turns
  } else if (cycle >= 16) {
    return "done"; // All rounds completed
  } else {
    return false; // Continue with the same team's turn
  }
}