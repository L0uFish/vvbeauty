import { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentUserRole(supabase: SupabaseClient) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Failed to load current user:", userError);
    return "client";
  }

  if (!user) {
    return "client";
  }

  const { data, error } = await supabase
    .from("clients")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load current user role:", error);
    return "client";
  }

  return data?.role ?? "client";
}
