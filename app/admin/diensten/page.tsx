// app/admin/diensten/page.tsx
import { getServerSupabase } from "@/lib/supabaseServer";
import SearchBar from "./components/SearchBar";
import AddButton from "./components/AddButton";
import ServicesTable from "./components/ServicesTable";
import { Service } from "./types/service";
import "../styles/diensten.css";

async function getServices(search?: string): Promise<Service[]> {
  const supabase = await getServerSupabase();
  let query = supabase
    .from("services")
    .select("*")
    .order("category_order", { ascending: true })
    .order("display_order", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Supabase error:", error);
    return [];
  }

  return data as Service[];
}

export default async function DienstenPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  // ⬅️ FIX: unwrap the promise
  const { q } = await props.searchParams;

  const search = q ?? "";
  const services = await getServices(search);

  return (
    <div className="diensten-page">
      <div className="services-toolbar">
        <h1>Diensten</h1>

        <div className="services-controls">
          <SearchBar initialQuery={search} />
          <AddButton />
        </div>
      </div>

      <ServicesTable initialServices={services} />
    </div>
  );
}
