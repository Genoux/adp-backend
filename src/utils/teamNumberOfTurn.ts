import supabase from "../supabase";

export async function assignNumberOfTurn(cycle: number, roomId: string) {
  console.log("cycle", cycle);
  const doublePickCycle = [7, 9, 11, 13];

  // Determine the number of turns based on the cycle value
  const nb_turn = doublePickCycle.includes(cycle) ? 2 : 1;

  // Update the teams table in Supabase
  const { data, error } = await supabase
    .from("teams")
    .update({ nb_turn })
    .eq("room", roomId)
    .eq("isturn", true);

  if (error) {
    console.error('Error updating number of turns:', error);
    return false;
  }
  return data;

}