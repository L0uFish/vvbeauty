"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import HeroCarousel from "../components/HeroCarousel";
import Header from "../components/LoginBtn";
import HomeButton from "../components/HomeButton";
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
        .order("display_order");

      if (error) console.error("Supabase error:", error);
      else setServices(data || []);
      setLoading(false);
    };
    fetchServices();
  }, []);

  const grouped = services.reduce((acc: Record<string, any[]>, s) => {
    acc[s.category] = acc[s.category] || [];
    acc[s.category].push(s);
    return acc;
  }, {});

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
            {Object.entries(grouped).map(([category, items]) => (
              <section className="price-section" key={category}>
                <h2 className="price-category">{category}</h2>
                <div className="price-list">
                  {items.map((s) => (
                    <div className="price-row" key={s.id}>
                      <div className="price-info">
                        <span className="price-name">{s.name}</span>
                        {s.description && (
                          <span className="price-desc">{s.description}</span>
                        )}
                      </div>
                      <div className="price-value">
                        {s.promo_price ? (
                          <>
                            <span className="old-price">€{s.price}</span>
                            <span className="promo-price">
                              €{s.promo_price}
                            </span>
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
