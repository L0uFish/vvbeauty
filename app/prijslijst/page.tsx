"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import HeroCarousel from "../components/home/HeroCarousel";
import Header from "../components/home/LoginBtn";
import HomeButton from "../components/home/HomeButton";
import "../styles/prijslijst.css";

export default function Prijslijst() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("category_order", { ascending: true })
        .order("display_order", { ascending: true });

      if (error) console.error("Supabase error:", error);
      else setServices(data || []);
      setLoading(false);
    };
    fetchServices();
  }, []);

  // --- Group by category ---
  const grouped = services.reduce((acc: Record<string, any[]>, s) => {
    const cat = s.category || "Overige";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  // --- Sort categories by lowest category_order ---
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
    <main className="prijslijst-container">
      <Header />
      <HomeButton />

      <section className="hero-section">
        <HeroCarousel />
        <div className="hero-overlay">
          <h1 className="hero-title">Diensten & Prijzen</h1>
          <p className="hero-subtitle">Onze behandelingen</p>
        </div>
      </section>

      <div className="price-wrapper">
        {loading ? (
          <p className="loading-text">Even laden...</p>
        ) : (
          <div className="price-columns">
            {sortedCategories.map((category) => (
              <section className="price-section" key={category}>
                <h2 className="price-category">{category}</h2>
                <div className="price-list">
                  {grouped[category]
                    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                    .map((s) => (
                      <div
                        className={`price-row ${!s.active ? "inactive" : ""}`}
                        key={s.id}
                      >
                        <div className="price-info">
                          <span className="price-name">
                            {s.name}
                            {!s.active && (
                              <span className="inactive-tag"> (niet beschikbaar)</span>
                            )}
                          </span>
                          {s.description && (
                            <span className="price-desc">{s.description}</span>
                          )}
                        </div>
                        <div className="price-value">
                          {s.promo_price ? (
                            <>
                              <span className="old-price">€{s.price}</span>
                              <span className="promo-price">€{s.promo_price}</span>
                            </>
                          ) : (
                            <span className="normal-price">€{s.price}</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
