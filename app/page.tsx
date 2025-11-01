import { supabase } from "@/lib/supabaseClient";

export default async function Home() {
  // Fetch data server-side
  const { data, error } = await supabase.from("services").select("*");

  console.log("Supabase test:", data, error);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">VVBeauty</h1>
      <p>Check your console (server logs in terminal) for Supabase output.</p>
    </main>
  );
}
