"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function DienstCard({ service }: { service: any }) {
  const [showDesc, setShowDesc] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // On mobile: first tap reveals, second tap navigates
    if (window.innerWidth < 768) {
      if (!showDesc) {
        e.preventDefault();
        setShowDesc(true);
      }
    }
  };

  // Auto-hide after 3s (optional)
  useEffect(() => {
    if (showDesc) {
      const timer = setTimeout(() => setShowDesc(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showDesc]);

  return (
    <Link
      href={`/plannen?service=${service.id}`}
      className={`dienst-card ${showDesc ? "show-desc" : ""}`}
      onClick={handleClick}
    >
      <h3 className="dienst-title">{service.name}</h3>

      <p className="dienst-desc">{service.description}</p>

      <p className="dienst-price">
        {service.promo_price ? (
          <>
            <span
              style={{
                textDecoration: "line-through",
                color: "#999",
                marginRight: "6px",
              }}
            >
              €{service.price}
            </span>
            <span style={{ color: "#e91e63" }}>€{service.promo_price}</span>
          </>
        ) : (
          <>€{service.price}</>
        )}
      </p>
    </Link>
  );
}
