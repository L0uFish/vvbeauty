import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PlannenClient from "./PlannenClient";

export default async function Page(props: { searchParams: Promise<{ service?: string }> }) {
  const searchParams = await props.searchParams;
  const serviceId = searchParams?.service;

  // ✅ Wait for cookies() and pass to new helper
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
        } catch {
          /* ignored for SSR read-only context */
        }
      },
      remove(name, options) {
        try {
          cookieStore.delete({ name, ...options });
        } catch {
          /* ignored for SSR read-only context */
        }
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

  const { data: service, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (error || !service) {
    return (
      <main className="plannen-container">
        <div className="plannen-card">
          <h2 className="plannen-title">Dienst niet gevonden</h2>
        </div>
      </main>
    );
  }

  return <PlannenClient initialService={service} />;
}
