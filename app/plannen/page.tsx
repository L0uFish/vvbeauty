// app/plannen/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PlannenClient from "./PlannenClient";

export default async function Page(props: { searchParams: Promise<{ service?: string }> }) {
  const searchParams = await props.searchParams;
  const serviceId = searchParams?.service;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name, options) {
          try {
            cookieStore.delete({ name, ...options });
          } catch {}
        },
      },
    }
  );

  if (!serviceId) {
    return (
      <main className="plannen-container">
        <div className="plannen-card">
          <h2 className="plannen-title">Geen dienst geselecteerd</h2>
          <p className="plannen-description">
            Gelieve eerst een dienst te kiezen via de Diensten-pagina.
          </p>
        </div>
      </main>
    );
  }

  // 1. Load service (no relations)
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, buffer_minutes")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    console.error("Service error:", serviceError);
    return (
      <main className="plannen-container">
        <div className="plannen-card">
          <h2 className="plannen-title">Dienst niet gevonden</h2>
          <p className="plannen-description">
            De gevraagde dienst bestaat niet of is niet beschikbaar.
          </p>
        </div>
      </main>
    );
  }

  // 2. Load ALL general_hours (global)
  const { data: generalHours } = await supabase
    .from("general_hours")
    .select("*");

  // 3. Load custom_hours for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const { data: customHours } = await supabase
    .from("custom_hours")
    .select("date, open_time, close_time, is_closed")
    .gte("date", `${year}-${month}-01`)
    .lte("date", `${year}-${month}-31`);

  // 4. Combine
  const serviceWithHours = {
    ...service,
    generalHours: generalHours || [],
    customHours: customHours || [],
  };

  return <PlannenClient initialService={serviceWithHours} />;
}