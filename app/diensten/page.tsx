import Link from "next/link";
import { getServerSupabase } from "@/lib/supabaseServer"; // ✅ server-side Supabase helper
import HeroCarousel from "../components/HeroCarousel";
import Header from "../components/LoginBtn";
import HomeButton from "../components/HomeButton";
import { setMultipleServices } from "@/lib/serviceCache"; // ✅ local cache for /plannen
import "../styles/diensten.css";

export default async function Boeking() {
  // ✅ create Supabase client for server context
  const supabase = await getServerSupabase();

  // ✅ fetch all active services ordered by category_order + display_order
  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("category_order", { ascending: true })
    .order("display_order", { ascending: true });

  if (error || !services) {
    console.error("Supabase error:", error);
    return (
      <main className="boeking-container">
        <Header />
        <HomeButton />
        <section className="error-section">
          <h2>Fout bij laden van diensten</h2>
          <p>Probeer het later opnieuw.</p>
        </section>
      </main>
    );
  }

  // ✅ cache all services for instant reuse on /plannen
  setMultipleServices(services);

  // ✅ group services by category
  const grouped = services.reduce((acc: Record<string, any[]>, s) => {
    const cat = s.category || "Overige";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  // ✅ get unique categories sorted by their lowest category_order value
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const aOrder =
      grouped[a].length > 0
        ? Math.min(...grouped[a].map((s) => s.category_order ?? 0))
        : 0;
    const bOrder =
      grouped[b].length > 0
        ? Math.min(...grouped[b].map((s) => s.category_order ?? 0))
        : 0;
    return aOrder - bOrder;
  });


  return (
    <main className="boeking-container">
      <Header />
      <HomeButton />

      {/* === HERO === */}
      <section className="hero-section">
        <HeroCarousel />
        <div className="hero-overlay">
          <h1 className="hero-title">Boek je Afspraak</h1>
        </div>
      </section>

      {/* === SERVICE LIST === */}
      <div className="page-container">
        {sortedCategories.map((category) => (
          <section key={category}>
            <h2>{category}</h2>
            <div className="service-grid">
              {grouped[category].map((s) => (
                <Link
                  key={s.id}
                  href={`/plannen?service=${s.id}`}
                  className="service-box"
                >
                  <div className="service-info">
                    <div className="service-name">{s.name}</div>
                    <div className="service-desc">{s.description}</div>
                  </div>

                  <div className="service-price">
                    {s.promo_price ? (
                      <>
                        <span className="old">€{s.price}</span>€{s.promo_price}
                      </>
                    ) : (
                      <>€{s.price}</>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
