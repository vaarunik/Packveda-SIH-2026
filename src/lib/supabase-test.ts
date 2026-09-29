// Supabase connection test — quick probe used by the Data & Sources page.
// Queries the `commodities` table (public read) to confirm the project
// credentials, network path, and RLS read access all work end to end.
import { supabase } from "./supabase";

export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from("commodities")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Supabase connection failed:", error);
    return false;
  }

  console.log("Supabase connected:", data);
  return true;
}
