import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import DienstCard from "./DienstCard";
import "./diensten.css";
import HomeButton from "../components/HomeButton";

export default async function Diensten() {
  // Fetch active services
  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("display_order");

  if (error) {
    console.error("Supabase error:", error);
    return (
      <main className="p-6">
        Er is een fout opgetreden bij het laden van de diensten.
      </main>
    );
  }

  if (!services || services.length === 0) {
    return (
      <main className="p-6">
        Geen diensten gevonden.
      </main>
    );
  }

  // Group by category
  const grouped = services.reduce((acc: Record<string, any[]>, s) => {
    acc[s.category] = acc[s.category] || [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <main>
      <HomeButton />
      <div className="page-container">
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <h2>{category}</h2>
            <div className="grid">
              {items.map((s) => (
                <DienstCard key={s.id} service={s} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
