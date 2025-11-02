import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import HeroCarousel from "../components/HeroCarousel";
import Header from "../components/Header";
import HomeButton from "../components/HomeButton";
import "../styles/diensten.css";

export default async function Boeking() {
  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("display_order");

  if (error || !services) return <main>Fout bij laden van diensten.</main>;

  const grouped = services.reduce((acc: Record<string, any[]>, s) => {
    acc[s.category] = acc[s.category] || [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <main className="boeking-container">
      <Header />
      <HomeButton />

      <section className="hero-section">
        <HeroCarousel />
        <div className="hero-overlay">
          <h1 className="hero-title">Boek je Afspraak</h1>
        </div>
      </section>

      <div className="page-container">
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <h2>{category}</h2>
            {items.map((s) => (
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
          </section>
        ))}
      </div>
    </main>
  );
}
